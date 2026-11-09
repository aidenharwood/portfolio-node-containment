import {
  CONTAIN_INTERACTION,
  GAME_CONTENT,
  npcQuestMarker,
  objectiveAreas,
  objectiveCreatureIds,
  objectiveObjectIds,
  relativeThreat,
  type NpcQuestMarker,
  type TilePoint,
} from '@containment/shared';
import type { AppNavigator } from '../app.ts';
import { ChatLog } from '../hud/chatLog.ts';
import { CombatOverlay } from '../hud/combatOverlay.ts';
import { ContextMenu } from '../hud/contextMenu.ts';
import { DialogueBox } from '../hud/dialogueBox.ts';
import { InteractionBubble, bubbleMeta, type BubbleContent } from '../hud/interactionBubble.ts';
import { Minimap } from '../hud/minimap.ts';
import { ClickIndicator, type ClickTone } from '../hud/clickIndicator.ts';
import { ObjectiveTracker } from '../hud/objectiveTracker.ts';
import { MarketWindow } from '../hud/marketWindow.ts';
import { ShopWindow } from '../hud/shopWindow.ts';
import { ActivityBar } from '../hud/activityBar.ts';
import { CraftingWindow } from '../hud/craftingWindow.ts';
import { StorageWindow } from '../hud/storageWindow.ts';
import { TramRide } from '../hud/tramRide.ts';
import { WorldMap } from '../hud/worldMap.ts';
import { setTooltipEquipment } from '../ui/itemTooltip.ts';
import { SidePanel } from '../hud/sidePanel.ts';
import { SpeechLayer } from '../hud/speechLayer.ts';
import { VitalsPanel } from '../hud/vitalsPanel.ts';
import { createBestiaryTab } from '../hud/tabs/bestiaryTab.ts';
import { createDossierTab } from '../hud/tabs/dossierTab.ts';
import { createEquipmentTab } from '../hud/tabs/equipmentTab.ts';
import { createInventoryTab } from '../hud/tabs/inventoryTab.ts';
import { createQuestsTab } from '../hud/tabs/questsTab.ts';
import { GuidanceRoute } from '../state/guidanceRoute.ts';
import { QuestTracking } from '../state/questTracking.ts';
import { createSkillsTab } from '../hud/tabs/skillsTab.ts';
import { actionsForTarget, type ActionContext } from '../input/worldActions.ts';
import { GameRenderer } from '../render/gameRenderer.ts';
import type { ClickMarker, PickTarget } from '../render/pickTarget.ts';
import { h, replaceChildren, type Screen } from '../ui/dom.ts';
import { isCoarsePointer } from '../ui/viewport.ts';

const DRAG_THRESHOLD_PIXELS = { mouse: 6, touch: 10 } as const;
const ORBIT_YAW_PER_PIXEL = 0.008;
const ORBIT_PITCH_PER_PIXEL = 0.006;
const ZOOM_STEP = 1.12;

interface PinchState {
  readonly distance: number;
  readonly midX: number;
  readonly midY: number;
}

interface DragState {
  readonly button: number;
  readonly touch: boolean;
  readonly startX: number;
  readonly startY: number;
  lastX: number;
  lastY: number;
  rotating: boolean;
}

export function createGameScreen(app: AppNavigator): Screen {
  const { connection, world } = app;
  const canvas = h('canvas', { className: 'world-canvas' });
  const renderer = new GameRenderer(canvas, world);
  const menu = new ContextMenu();
  const chat = new ChatLog(connection);
  const dialogue = new DialogueBox(connection);
  const questTracking = new QuestTracking();
  const objectives = new ObjectiveTracker(questTracking);
  const guidanceRoute = new GuidanceRoute(world);
  questTracking.onChange(() => refreshGuidance());
  const bubble = new InteractionBubble();
  const speech = new SpeechLayer();
  const combatOverlay = new CombatOverlay(world);
  const vitals = new VitalsPanel((entityId) => {
    connection.send({ type: 'world.interact', targetKind: 'creature', instanceId: entityId.replace(/^creature:/, ''), interactionIndex: CONTAIN_INTERACTION });
  });
  const shop = new ShopWindow(connection, world, menu);
  const storage = new StorageWindow(connection, world, menu);
  const market = new MarketWindow(connection, world);
  const crafting = new CraftingWindow(connection, world);
  const activity = new ActivityBar(connection, world);
  const clickIndicator = new ClickIndicator();
  const zoneBanner = h('div', { className: 'zone-banner' });
  const cameraHint = h('div', { className: 'camera-hint' },
    isCoarsePointer() ? 'Drag to rotate · Pinch to zoom · Hold for options' : 'Drag or Q / E to rotate · Scroll to zoom · Home to reset');

  let hover: PickTarget | null = null;
  let clickMarker: ClickMarker | null = null;
  let npcMarkers = new Map<string, NpcQuestMarker>();
  let objectiveObjects = new Set<string>();
  let objectiveCreatures = new Set<string>();
  let objectiveBeacons: TilePoint[] = [];
  let pointer: { x: number; y: number; clientX: number; clientY: number } | null = null;
  let drag: DragState | null = null;
  let pointerIsTouch = false;
  const touches = new Map<number, { x: number; y: number }>();
  let pinch: PinchState | null = null;
  let multiTouchGesture = false;
  let frameHandle = 0;
  let clickOrigin: { clientX: number; clientY: number } | null = null;

  const examine = (text: string) => chat.push({ channel: 'examine', text });
  const actionContext = (): ActionContext => ({
    connection,
    selfEntityId: world.selfEntityId,
    examine,
    markClick: (tile, tone) => markDestination(tile, tone),
  });

  const markDestination = (tile: TilePoint, tone: ClickTone) => {
    clickMarker = { tile, tone, startedAt: performance.now() };
    minimap.setDestination(tile, tone);
    if (clickOrigin) clickIndicator.show(clickOrigin.clientX, clickOrigin.clientY, tone);
  };

  const walkTo = (tile: TilePoint, clientX: number, clientY: number) => {
    const target = world.walkTargetFor(tile);
    if (!target) return;
    clickOrigin = { clientX, clientY };
    markDestination(target, 'walk');
    connection.send({ type: 'world.walk', target });
  };

  const worldMap = new WorldMap(connection, world, questTracking);
  const tramRide = new TramRide(connection, world);
  const minimap = new Minimap(world, walkTo, () => worldMap.toggle());
  const sidePanel = new SidePanel([
    createInventoryTab(connection, menu, { examine }),
    createEquipmentTab(connection, world),
    createSkillsTab(),
    createQuestsTab(menu, questTracking),
    createBestiaryTab(),
    createDossierTab(connection, world),
  ]);

  const refreshBeacons = () => {
    const self = world.self;
    const areas = world.zone?.definition.areas ?? [];
    if (!self) return;
    objectiveBeacons = objectiveAreas(self.quests, GAME_CONTENT.quests, questTracking.questId).flatMap((target) =>
      areas
        .filter((area) => area.districtId === target.districtId && area.id === target.areaId)
        .map((area) => ({ x: area.rect.x + Math.floor(area.rect.width / 2), y: area.rect.y + Math.floor(area.rect.height / 2) })),
    );
  };

  const refreshGuidance = () => {
    const self = world.self;
    if (!self) return;
    questTracking.bind(self.characterId);
    npcMarkers = new Map();
    for (const npc of GAME_CONTENT.npcs.values()) {
      const marker = npcQuestMarker(npc.id, self.quests, GAME_CONTENT.quests, questTracking.questId);
      if (marker) npcMarkers.set(npc.id, marker);
    }
    setTooltipEquipment(self.equipment);
    objectiveObjects = objectiveObjectIds(self.quests, GAME_CONTENT.quests, questTracking.questId, GAME_CONTENT.worldObjects, GAME_CONTENT.recipes);
    objectiveCreatures = objectiveCreatureIds(self.quests, GAME_CONTENT.quests, questTracking.questId);
    refreshBeacons();
    guidanceRoute.invalidate();
    objectives.update(self.quests);
    sidePanel.update(self);
  };

  const showZoneBanner = () => {
    const district = world.currentDistrict();
    if (!district) return;
    const layerLabel = world.layer > 1 ? ` · Layer ${world.layer}` : '';
    replaceChildren(zoneBanner, h('p', { className: 'zone-subtitle' }, district.subtitle + layerLabel), h('h2', { className: 'zone-name' }, district.name));
    zoneBanner.classList.remove('visible');
    void zoneBanner.offsetWidth;
    zoneBanner.classList.add('visible');
  };

  let shownDistrictId: string | null = null;

  const onZoneChanged = () => {
    renderer.rebuildZone();
    guidanceRoute.invalidate();
    minimap.rebuild();
    refreshBeacons();
    shownDistrictId = world.currentDistrict()?.id ?? null;
    showZoneBanner();
  };

  const followDistrict = () => {
    const district = world.currentDistrict();
    if (!district || district.id === shownDistrictId) return;
    shownDistrictId = district.id;
    minimap.refreshTitle();
    showZoneBanner();
  };

  const bubbleContentFor = (target: PickTarget | null): BubbleContent | null => {
    if (!target || target.kind === 'tile') return null;
    const actions = actionsForTarget(target, actionContext());
    if (target.kind === 'groundItem') {
      return { actions, subtitle: target.item.owned ? 'Reserved for you' : 'Unclaimed' };
    }
    if (target.kind === 'object') {
      return { actions, objective: objectiveObjects.has(target.definition.id) };
    }
    const { entity } = target;
    if (entity.id === world.selfEntityId) return null;
    if (entity.kind === 'creature') {
      const creature = entity.creatureId ? GAME_CONTENT.creatures.get(entity.creatureId) : undefined;
      return {
        actions,
        subtitle: creature ? [`Level ${creature.level}`, creature.designation].filter(Boolean).join(' · ') : undefined,
        threat: creature && world.self ? relativeThreat(world.self.combatLevel, creature.level) : undefined,
        objective: Boolean(entity.creatureId && objectiveCreatures.has(entity.creatureId)),
      };
    }
    const marker = entity.npcId ? npcMarkers.get(entity.npcId) : undefined;
    return {
      actions,
      subtitle: entity.kind === 'npc' ? entity.title : 'Operative',
      objective: marker === 'objective',
    };
  };

  const refreshHover = () => {
    if (!pointer || menu.isOpen || drag?.rotating) {
      bubble.hide();
      return;
    }
    hover = renderer.pick(pointer.x, pointer.y);
    const content = pointerIsTouch ? null : bubbleContentFor(hover);
    if (content) bubble.show(pointer.clientX, pointer.clientY, content);
    else bubble.hide();
    canvas.style.cursor = hover && hover.kind !== 'tile' ? 'pointer' : drag?.rotating ? 'grabbing' : 'default';
  };

  const performPrimaryAction = () => {
    refreshHover();
    clickOrigin = pointer ? { clientX: pointer.clientX, clientY: pointer.clientY } : null;
    actionsForTarget(hover, actionContext())[0]?.run();
  };

  const trackPointer = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, clientX: event.clientX, clientY: event.clientY };
  };

  const measurePinch = (): PinchState | null => {
    const [first, second] = [...touches.values()];
    if (!first || !second) return null;
    return { distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)), midX: (first.x + second.x) / 2, midY: (first.y + second.y) / 2 };
  };

  const forgetTouchPointer = () => {
    pointer = null;
    hover = null;
  };

  canvas.addEventListener('pointerdown', (event) => {
    pointerIsTouch = event.pointerType === 'touch';
    if (pointerIsTouch) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture(event.pointerId);
      if (touches.size >= 2) {
        drag = null;
        multiTouchGesture = true;
        pinch = measurePinch();
        bubble.hide();
        cameraHint.classList.add('dismissed');
        return;
      }
      multiTouchGesture = false;
      trackPointer(event);
    }
    if (event.button !== 0 && event.button !== 1) return;
    if (event.button === 1) event.preventDefault();
    drag = { button: event.button, touch: pointerIsTouch, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, rotating: event.button === 1 };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') {
      if (!touches.has(event.pointerId)) return;
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch) {
        const next = measurePinch();
        if (next) {
          renderer.cameraRig.zoom(pinch.distance / next.distance);
          renderer.cameraRig.orbit(-(next.midX - pinch.midX) * ORBIT_YAW_PER_PIXEL, (next.midY - pinch.midY) * ORBIT_PITCH_PER_PIXEL);
          pinch = next;
        }
        return;
      }
    } else {
      pointerIsTouch = false;
      trackPointer(event);
    }
    if (drag) {
      const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (!drag.rotating && travelled > DRAG_THRESHOLD_PIXELS[drag.touch ? 'touch' : 'mouse']) {
        drag.rotating = true;
        cameraHint.classList.add('dismissed');
      }
      if (drag.rotating) {
        renderer.cameraRig.orbit(-(event.clientX - drag.lastX) * ORBIT_YAW_PER_PIXEL, (event.clientY - drag.lastY) * ORBIT_PITCH_PER_PIXEL);
        bubble.hide();
      }
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    }
  });

  const endTouch = (event: PointerEvent): boolean => {
    if (event.pointerType !== 'touch') return false;
    touches.delete(event.pointerId);
    if (touches.size < 2) pinch = null;
    if (!multiTouchGesture) return false;
    drag = null;
    if (touches.size === 0) {
      multiTouchGesture = false;
      forgetTouchPointer();
    }
    return true;
  };

  canvas.addEventListener('pointerup', (event) => {
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (endTouch(event)) return;
    const finished = drag;
    drag = null;
    if (finished && finished.button === 0 && !finished.rotating && !menu.isOpen) performPrimaryAction();
    if (finished?.touch && !menu.isOpen) forgetTouchPointer();
  });

  canvas.addEventListener('pointercancel', (event) => {
    endTouch(event);
    drag = null;
    if (event.pointerType === 'touch' && touches.size === 0) forgetTouchPointer();
  });

  canvas.addEventListener('pointerleave', () => {
    if (drag || pointerIsTouch) return;
    pointer = null;
    hover = null;
    bubble.hide();
  });

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    refreshHover();
    const targets = pointer ? renderer.pickAll(pointer.x, pointer.y) : hover ? [hover] : [];
    const context = actionContext();
    const stacked = targets.flatMap((target) => actionsForTarget(target, context));
    const walk = stacked.findLast((action) => action.verb === 'Walk here');
    const actions = [...stacked.filter((action) => action.verb !== 'Walk here'), ...(walk ? [walk] : [])];
    const touchContent = pointerIsTouch ? bubbleContentFor(targets.find((target) => target.kind !== 'tile') ?? null) : null;
    const touchDetails = touchContent ? bubbleMeta(touchContent) : null;
    bubble.hide();
    drag = null;
    if (pointerIsTouch) forgetTouchPointer();
    clickOrigin = { clientX: event.clientX, clientY: event.clientY };
    if (actions.length > 0) menu.open(event.clientX, event.clientY, actions, touchDetails);
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    renderer.cameraRig.zoom(event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    cameraHint.classList.add('dismissed');
  }, { passive: false });

  const onKeyDown = (event: KeyboardEvent) => {
    if (chat.isTyping()) return;
    const activatesFocused = (event.key === 'Enter' || event.key === ' ')
      && event.target instanceof Element
      && event.target.closest('button, [role="button"], input, textarea, select') !== null;
    if (activatesFocused) return;
    if (event.key === 'Escape' && shop.isOpen) {
      shop.requestClose();
      return;
    }
    if (event.key === 'Escape' && crafting.isOpen) {
      crafting.requestClose();
      return;
    }
    if (event.key === 'Escape' && storage.isOpen) {
      storage.requestClose();
      return;
    }
    if (event.key === 'Escape' && market.isOpen) {
      market.requestClose();
      return;
    }
    if (event.key === 'Escape' && worldMap.isOpen) {
      worldMap.requestClose();
      return;
    }
    if ((event.key === 'm' || event.key === 'M') && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      worldMap.toggle();
      return;
    }
    if (dialogue.handleKey(event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape' && !menu.isOpen && !sidePanel.isCollapsed) {
      sidePanel.collapse();
      return;
    }
    if (renderer.cameraRig.pressKey(event.key, true)) {
      event.preventDefault();
      cameraHint.classList.add('dismissed');
      return;
    }
    if (event.key === 'Home') {
      renderer.cameraRig.reset();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      chat.focusInput();
      return;
    }
    const panelKey = event.ctrlKey || event.altKey || event.metaKey ? null : /^F?([1-5])$/.exec(event.key);
    if (panelKey) {
      event.preventDefault();
      sidePanel.toggleByIndex(Number(panelKey[1]) - 1);
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    renderer.cameraRig.pressKey(event.key, false);
  };
  const onBlur = () => renderer.cameraRig.releaseAllKeys();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  const onResize = () => renderer.resize();
  window.addEventListener('resize', onResize);

  const unsubscribers = [world.on('zoneChanged', onZoneChanged), world.on('selfChanged', refreshGuidance)];

  const loop = (now: number) => {
    renderer.render(now, { hover, clickMarker, objectiveObjectIds: objectiveObjects, npcMarkers, objectiveCreatureIds: objectiveCreatures, objectiveBeacons, guidanceRoute: guidanceRoute.current(now, questTracking.questId) });
    refreshHover();
    speech.update(world, renderer, now);
    combatOverlay.update(world, renderer, now);
    vitals.update(world);
    minimap.render(now, renderer.cameraRig.headingRadians);
    followDistrict();
    frameHandle = requestAnimationFrame(loop);
  };

  chat.element.prepend(vitals.element);
  const element = h(
    'div',
    { className: 'screen game-screen' },
    canvas,
    speech.element,
    combatOverlay.element,
    h('div', { className: 'scanlines' }),
    zoneBanner,
    cameraHint,
    h('div', { className: 'hud-top-left' }, vitals.targetElement, objectives.element),
    minimap.element,
    sidePanel.element,
    chat.element,
    dialogue.element,
    shop.element,
    crafting.element,
    storage.element,
    market.element,
    worldMap.element,
    activity.element,
    tramRide.element,
    clickIndicator.element,
    bubble.element,
    menu.element,
  );

  const panelObserver = new ResizeObserver(() => element.style.setProperty('--side-panel-height', `${sidePanel.element.offsetHeight}px`));
  panelObserver.observe(sidePanel.element);

  requestAnimationFrame(() => {
    renderer.resize();
    if (world.zone) onZoneChanged();
    refreshGuidance();
    frameHandle = requestAnimationFrame(loop);
  });

  return {
    element,
    unmount: () => {
      cancelAnimationFrame(frameHandle);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      panelObserver.disconnect();
      chat.dispose();
      combatOverlay.dispose();
      dialogue.dispose();
      shop.dispose();
      crafting.dispose();
      storage.dispose();
      market.dispose();
      worldMap.dispose();
      tramRide.dispose();
      activity.dispose();
      menu.dispose();
      sidePanel.dispose();
      renderer.dispose();
    },
  };
}

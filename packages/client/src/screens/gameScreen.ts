import {
  GAME_CONTENT,
  npcQuestMarker,
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
import { InteractionBubble, type BubbleContent } from '../hud/interactionBubble.ts';
import { Minimap } from '../hud/minimap.ts';
import { Notices } from '../hud/notices.ts';
import { ObjectiveTracker } from '../hud/objectiveTracker.ts';
import { ShopWindow } from '../hud/shopWindow.ts';
import { ActivityBar } from '../hud/activityBar.ts';
import { CraftingWindow } from '../hud/craftingWindow.ts';
import { StorageWindow } from '../hud/storageWindow.ts';
import { setTooltipEquipment } from '../ui/itemTooltip.ts';
import { SidePanel } from '../hud/sidePanel.ts';
import { SpeechLayer } from '../hud/speechLayer.ts';
import { VitalsPanel } from '../hud/vitalsPanel.ts';
import { createDossierTab } from '../hud/tabs/dossierTab.ts';
import { createEquipmentTab } from '../hud/tabs/equipmentTab.ts';
import { createInventoryTab } from '../hud/tabs/inventoryTab.ts';
import { createQuestsTab } from '../hud/tabs/questsTab.ts';
import { createSkillsTab } from '../hud/tabs/skillsTab.ts';
import { actionsForTarget, type ActionContext } from '../input/worldActions.ts';
import { GameRenderer } from '../render/gameRenderer.ts';
import type { ClickMarker, PickTarget } from '../render/pickTarget.ts';
import { h, replaceChildren, type Screen } from '../ui/dom.ts';

const DRAG_THRESHOLD_PIXELS = 6;
const ORBIT_YAW_PER_PIXEL = 0.008;
const ORBIT_PITCH_PER_PIXEL = 0.006;
const ZOOM_STEP = 1.12;

interface DragState {
  readonly button: number;
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
  const notices = new Notices(connection);
  const dialogue = new DialogueBox(connection);
  const objectives = new ObjectiveTracker();
  const bubble = new InteractionBubble();
  const speech = new SpeechLayer();
  const combatOverlay = new CombatOverlay(world);
  const vitals = new VitalsPanel();
  const shop = new ShopWindow(connection, world, menu);
  const storage = new StorageWindow(connection, world, menu);
  const crafting = new CraftingWindow(connection, world);
  const activity = new ActivityBar(connection, world);
  const zoneBanner = h('div', { className: 'zone-banner' });
  const cameraHint = h('div', { className: 'camera-hint' }, 'Drag or Q / E to rotate · Scroll to zoom · Home to reset');

  let hover: PickTarget | null = null;
  let clickMarker: ClickMarker | null = null;
  let npcMarkers = new Map<string, NpcQuestMarker>();
  let objectiveObjects = new Set<string>();
  let objectiveCreatures = new Set<string>();
  let pointer: { x: number; y: number; clientX: number; clientY: number } | null = null;
  let drag: DragState | null = null;
  let frameHandle = 0;

  const examine = (text: string) => chat.push({ channel: 'examine', text });
  const actionContext = (): ActionContext => ({
    connection,
    selfEntityId: world.selfEntityId,
    examine,
    markClick: (tile, tone) => {
      clickMarker = { tile, tone, startedAt: performance.now() };
    },
  });

  const walkTo = (tile: TilePoint) => {
    clickMarker = { tile, tone: 'walk', startedAt: performance.now() };
    connection.send({ type: 'world.walk', target: tile });
  };

  const minimap = new Minimap(world, walkTo);
  const sidePanel = new SidePanel([
    createInventoryTab(connection, menu, { examine }),
    createEquipmentTab(connection),
    createSkillsTab(),
    createQuestsTab(),
    createDossierTab(connection, world),
  ]);

  const refreshGuidance = () => {
    const self = world.self;
    if (!self) return;
    npcMarkers = new Map();
    for (const npc of GAME_CONTENT.npcs.values()) {
      const marker = npcQuestMarker(npc.id, self.quests, GAME_CONTENT.quests);
      if (marker) npcMarkers.set(npc.id, marker);
    }
    setTooltipEquipment(self.equipment);
    objectiveObjects = objectiveObjectIds(self.quests, GAME_CONTENT.quests, GAME_CONTENT.worldObjects, GAME_CONTENT.recipes);
    objectiveCreatures = objectiveCreatureIds(self.quests, GAME_CONTENT.quests);
    objectives.update(self.quests);
    sidePanel.update(self);
  };

  const showZoneBanner = () => {
    const zone = world.zone?.definition;
    if (!zone) return;
    const layerLabel = world.layer > 1 ? ` · Layer ${world.layer}` : '';
    replaceChildren(zoneBanner, h('p', { className: 'zone-subtitle' }, zone.subtitle + layerLabel), h('h2', { className: 'zone-name' }, zone.name));
    zoneBanner.classList.remove('visible');
    void zoneBanner.offsetWidth;
    zoneBanner.classList.add('visible');
  };

  const onZoneChanged = () => {
    renderer.rebuildZone();
    minimap.rebuild();
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
    const content = bubbleContentFor(hover);
    if (content) bubble.show(pointer.clientX, pointer.clientY, content);
    else bubble.hide();
    canvas.style.cursor = hover && hover.kind !== 'tile' ? 'pointer' : drag?.rotating ? 'grabbing' : 'default';
  };

  const performPrimaryAction = () => {
    refreshHover();
    actionsForTarget(hover, actionContext())[0]?.run();
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.button === 1) event.preventDefault();
    drag = { button: event.button, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, rotating: event.button === 1 };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, clientX: event.clientX, clientY: event.clientY };
    if (drag) {
      const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (!drag.rotating && travelled > DRAG_THRESHOLD_PIXELS) {
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

  canvas.addEventListener('pointerup', (event) => {
    const finished = drag;
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (finished && finished.button === 0 && !finished.rotating && !menu.isOpen) performPrimaryAction();
  });

  canvas.addEventListener('pointerleave', () => {
    if (drag) return;
    pointer = null;
    hover = null;
    bubble.hide();
  });

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    refreshHover();
    const target = pointer ? renderer.pick(pointer.x, pointer.y, { scenery: true }) : hover;
    const actions = actionsForTarget(target, actionContext());
    bubble.hide();
    if (actions.length > 0) menu.open(event.clientX, event.clientY, actions);
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    renderer.cameraRig.zoom(event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    cameraHint.classList.add('dismissed');
  }, { passive: false });

  const onKeyDown = (event: KeyboardEvent) => {
    if (chat.isTyping()) return;
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
    if (dialogue.handleKey(event.key)) {
      event.preventDefault();
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
    const functionKey = /^F([1-5])$/.exec(event.key);
    if (functionKey) {
      event.preventDefault();
      sidePanel.selectByIndex(Number(functionKey[1]) - 1);
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
    renderer.render(now, { hover, clickMarker, objectiveObjectIds: objectiveObjects, npcMarkers });
    refreshHover();
    speech.update(world, renderer, now);
    combatOverlay.update(world, renderer, now);
    vitals.update(world);
    minimap.render(now, renderer.cameraRig.headingRadians);
    frameHandle = requestAnimationFrame(loop);
  };

  const element = h(
    'div',
    { className: 'screen game-screen' },
    canvas,
    speech.element,
    combatOverlay.element,
    h('div', { className: 'scanlines' }),
    zoneBanner,
    cameraHint,
    objectives.element,
    minimap.element,
    vitals.element,
    vitals.targetElement,
    sidePanel.element,
    chat.element,
    dialogue.element,
    shop.element,
    crafting.element,
    storage.element,
    activity.element,
    notices.element,
    bubble.element,
    menu.element,
  );

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
      chat.dispose();
      combatOverlay.dispose();
      notices.dispose();
      dialogue.dispose();
      shop.dispose();
      crafting.dispose();
      storage.dispose();
      activity.dispose();
      menu.dispose();
      sidePanel.dispose();
      renderer.dispose();
    },
  };
}

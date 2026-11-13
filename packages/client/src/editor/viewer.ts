import {
  findContentIssues,
  GAME_CONTENT,
  issuesFromMessages,
  LAYOUT_CHOICES,
  LAYOUT_SOURCES,
  type DistrictId,
  type GameContent,
  type LevelId,
  type PlanIssue,
  type ResolvedLevel,
  type TileKindId,
  type TilePoint,
} from '@containment/shared';
import type { Object3D } from 'three';
import type { ActiveZone } from '../state/worldState.ts';
import { contentWith, type EditedDistrict } from './contentWith.ts';
import { EditorDocument } from './document.ts';
import { EditController, type PaletteEntry } from './editController.ts';
import { addEntry } from './edits.ts';
import { boundsOf, hitsAt } from './hitTest.ts';
import { footprintOf, modelOf } from './itemModels.ts';
import { districtAtLevelTile, levelIssues, levelPlan, originOf, tileImageOf } from './levelView.ts';
import { Palette, paletteEntries } from './palette.ts';
import { PlanCanvas, planDrawList, type PlanShape } from './planCanvas.ts';
import { previewZone, zoneOfLevel } from './previewLevel.ts';
import { PreviewView, type EditPointer } from './previewView.ts';
import { PropertiesPanel } from './propertiesPanel.ts';
import { saveDistrict } from './saveClient.ts';
import { PLAN_LAYERS, readViewState, writeViewState, type PlanLayer, type ViewState } from './viewState.ts';

const LEVEL_PREFIX = 'level:';
const ORIGIN: TilePoint = { x: 0, y: 0 };

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
};

const isTyping = (target: EventTarget | null): boolean => target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

export interface ViewerServices {
  readonly base: GameContent;
  readonly document: EditorDocument;
  liveContent(): GameContent;
  wholeContent(): GameContent;
  messages(): readonly string[];
  refreshChecks(): void;
}

function start(root: HTMLElement, services: ViewerServices): void {
  const { base, document: editorDocument } = services;
  const known = new Set([...base.districts.keys()].sort());
  const levels = new Set([...base.levels.keys()]);
  let state: ViewState = readViewState(location.search, known, levels);
  let editing = false;

  const bar = element('header', { class: 'bar' });
  const title = element('h1', {}, 'Region editor');
  const scopeSelect = element('select', { 'aria-label': 'District or level' });
  const levelGroup = element('optgroup', { label: 'Levels' });
  for (const id of levels) levelGroup.append(element('option', { value: `${LEVEL_PREFIX}${id}` }, base.levels.get(id)?.name ?? id));
  const districtGroup = element('optgroup', { label: 'Districts' });
  for (const id of known) districtGroup.append(element('option', { value: id }, base.districts.get(id)?.name ?? id));
  scopeSelect.append(levelGroup, districtGroup);
  const roomSelect = element('select', { 'aria-label': 'Room' });
  const viewButtons = (['split', '2d', '3d'] as const).map((mode) => {
    const button = element('button', { type: 'button', 'data-view': mode }, mode === 'split' ? 'Split' : mode.toUpperCase());
    button.addEventListener('click', () => update({ view: mode }));
    return button;
  });
  viewButtons[0]?.setAttribute('title', 'Show the plan and the 3D view side by side');
  viewButtons[1]?.setAttribute('title', 'Show only the top-down plan');
  viewButtons[2]?.setAttribute('title', 'Show only the 3D view');
  const editToggle = element('button', { type: 'button', class: 'edit-toggle', 'aria-pressed': 'false', title: 'Turn editing on to move, add and paint things' }, 'Edit map');
  const helpButton = element('button', { type: 'button', class: 'help-toggle', title: 'Keyboard shortcuts and how-to (?)', 'aria-label': 'Help' }, '?');
  const layerBox = element('div', { class: 'layers' });
  const layerInputs = new Map<PlanLayer, HTMLInputElement>();
  for (const layer of PLAN_LAYERS) {
    const label = element('label');
    const input = element('input', { type: 'checkbox' });
    input.addEventListener('change', () => update({ layers: PLAN_LAYERS.filter((each) => layerInputs.get(each)?.checked) }));
    layerInputs.set(layer, input);
    label.append(input, layer);
    layerBox.append(label);
  }
  const readout = element('div', { class: 'readout' });
  bar.append(title, scopeSelect, roomSelect, ...viewButtons, editToggle, helpButton, layerBox, readout);

  const tools = element('div', { class: 'tools', hidden: '' });
  const TOOL_INFO = {
    select: { label: 'Select', key: 'V', tip: 'Click to pick things on the plan, drag to move them' },
    paint: { label: 'Paint', key: 'B', tip: 'Drag across the plan to paint floor tiles' },
    erase: { label: 'Erase', key: 'E', tip: 'Drag across the plan to remove painted tiles' },
  } as const;
  const toolButtons = (['select', 'paint', 'erase'] as const).map((tool) => {
    const info = TOOL_INFO[tool];
    const button = element('button', { type: 'button', 'data-tool': tool, title: `${info.tip} (${info.key})` });
    button.append(info.label, element('kbd', {}, info.key));
    button.addEventListener('click', () => {
      controller.setPending(null);
      controller.tool = tool;
      refreshEditing();
    });
    return button;
  });
  const brushLabel = element('label', { class: 'brush' });
  const brush = element('select', { 'aria-label': 'Paint tile' });
  brush.append(...LAYOUT_CHOICES.tiles.map((tile) => element('option', { value: tile }, tile)));
  brush.value = 'hazard';
  brush.addEventListener('change', () => {
    controller.brush = brush.value as TileKindId;
    refreshEditing();
  });
  brushLabel.append('Tile', brush);
  const separator = (): HTMLElement => element('span', { class: 'separator', 'aria-hidden': 'true' });
  const undo = element('button', { type: 'button', title: 'Undo the last change (Ctrl+Z)' }, 'Undo');
  const redo = element('button', { type: 'button', title: 'Redo what you undid (Ctrl+Shift+Z or Ctrl+Y)' }, 'Redo');
  const check = element('button', { type: 'button', title: 'Re-run the world design checks on your edits' }, 'Check');
  const save = element('button', { type: 'button', class: 'save', title: 'Write your changes to the layout files (Ctrl+S)' }, 'Save');
  const dirty = element('span', { class: 'dirty', role: 'status' });
  const banner = element('div', { class: 'banner', role: 'status', 'aria-live': 'polite' });
  tools.append(...toolButtons, brushLabel, separator(), undo, redo, separator(), check, save, dirty, banner);

  const help = element('dialog', { class: 'help', 'aria-label': 'Editor help' });
  const helpClose = element('button', { type: 'button', class: 'help-close', 'aria-label': 'Close help' }, 'Close');
  const helpBody = element('div');
  const helpSection = (heading: string, rows: readonly (readonly [string, string])[]): HTMLElement => {
    const section = element('section');
    const list = element('dl');
    for (const [keys, what] of rows) list.append(element('dt', {}, keys), element('dd', {}, what));
    section.append(element('h3', {}, heading), list);
    return section;
  };
  helpBody.append(
    element('h2', {}, 'Using the region editor'),
    element('p', {}, 'Pick a level or district at the top and press Edit map. Drag things from the catalogue on the right straight into the 3D view. Click something in 3D to select it, drag it to move it, and use the buttons that float above it to rotate, copy or remove it. Rooms and floor paint are edited on the 2D plan. Save writes your changes to the layout files.'),
    helpSection('In the 3D view', [
      ['Drag a thing', 'Move it'],
      ['Drag empty space', 'Orbit the camera'],
      ['Right-drag', 'Pan the camera'],
      ['Mouse wheel', 'Zoom'],
      ['Drag from catalogue', 'Place a new thing; red means it cannot go there'],
    ]),
    helpSection('Tools', [
      ['V', 'Select and move'],
      ['B', 'Paint floor tiles'],
      ['E', 'Erase painted tiles'],
      ['/', 'Search things to add'],
    ]),
    helpSection('Selection', [
      ['Click again', 'Cycle through things stacked on one tile'],
      ['Arrow keys', 'Nudge one tile'],
      ['R', 'Rotate'],
      ['Ctrl+D', 'Duplicate'],
      ['Delete', 'Remove'],
      ['Esc', 'Deselect or stop placing'],
      ['Shift+click', 'Keep placing the same thing'],
    ]),
    helpSection('General', [
      ['Ctrl+Z', 'Undo'],
      ['Ctrl+Shift+Z', 'Redo'],
      ['Ctrl+S', 'Save'],
      ['Mouse wheel', 'Zoom the plan'],
      ['Drag', 'Pan the plan (right-drag while editing)'],
      ['F', 'Fit the whole plan in view'],
      ['?', 'Show this help'],
    ]),
  );
  help.append(helpClose, helpBody);
  helpClose.addEventListener('click', () => help.close());
  help.addEventListener('click', (event) => {
    if (event.target === help) help.close();
  });
  const toggleHelp = (): void => {
    if (help.open) help.close();
    else help.showModal();
  };
  helpButton.addEventListener('click', toggleHelp);

  const views = element('main', { class: 'views' });
  const planHost = element('div');
  const canvas = element('canvas', { id: 'plan' });
  planHost.append(canvas);
  const preview = element('section', { id: 'preview', 'aria-label': '3D view' });
  const side = element('aside', { class: 'side', hidden: '' });
  views.append(planHost, preview, side);

  const issuePanel = element('section', { class: 'issues-panel', 'aria-label': 'Issues' });
  const issueHeading = element('h2');
  const issueList = element('ul', { class: 'issues' });
  issuePanel.append(issueHeading, issueList);
  root.append(bar, tools, views, issuePanel, help);

  const plan = new PlanCanvas(canvas);
  const preview3d = new PreviewView(preview);
  const controller = new EditController(editorDocument, state.district);
  const properties = new PropertiesPanel(base, controller);
  const palette = new Palette(
    paletteEntries(base),
    (entry) => {
      controller.setPending(entry);
      refreshEditing();
    },
    (entry) => {
      catalogueDrag = entry;
      if (!entry) showPlacement(null, null);
    },
  );
  side.append(palette.root, properties.root);

  const previewControls = element('div', { class: 'preview-controls' });
  const gameAngle = element('button', { type: 'button' }, 'Game angle');
  gameAngle.addEventListener('click', () => preview3d.gameAngle());
  const survey = element('button', { type: 'button', 'aria-pressed': 'false' }, 'Survey light');
  survey.addEventListener('click', () => {
    const on = survey.getAttribute('aria-pressed') !== 'true';
    survey.setAttribute('aria-pressed', String(on));
    preview3d.setSurvey(on);
  });
  previewControls.append(survey, gameAngle);
  preview.append(previewControls);

  let cameraKey = '';
  const cameraKeyOf = (view: ViewState): string => `${view.yaw},${view.pitch},${view.zoom},${view.focus?.x},${view.focus?.y}`;
  preview3d.onCamera((camera) => {
    state = { ...state, ...camera };
    cameraKey = cameraKeyOf(state);
    history.replaceState(null, '', writeViewState(state));
  });

  let notice = '';
  let noticeTimer = 0;
  const announce = (text: string): void => {
    notice = text;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => {
      notice = '';
      refreshEditing();
    }, 4000);
  };

  let shapes: PlanShape[] = [];
  let issues: PlanIssue[] = [];
  let content = services.liveContent();
  let whole: GameContent | null = null;
  let pointerOrigin: TilePoint = ORIGIN;

  const inLevel = (): boolean => state.level !== undefined;
  const wholeNow = (): GameContent => {
    whole ??= services.wholeContent();
    return whole;
  };
  const levelNow = (): ResolvedLevel | undefined => (state.level ? wholeNow().levels.get(state.level) : undefined);
  const districtNow = () => content.districts.get(state.district);
  const editOrigin = (): TilePoint => {
    const level = levelNow();
    return inLevel() && level ? originOf(level, controller.district) : ORIGIN;
  };

  const computeIssues = (): void => {
    const level = levelNow();
    issues = level ? levelIssues(wholeNow(), level, services.messages()) : issuesFromMessages(wholeNow(), state.district, services.messages());
  };

  const computeShapes = (): void => {
    const level = levelNow();
    shapes = level ? levelPlan(wholeNow(), level, state.layers, issues) : planDrawList(content, state.district, state.layers, issues);
  };

  const roomAt = (tile: TilePoint): string | undefined => {
    const rooms = districtNow()?.rooms ?? {};
    return Object.entries(rooms).find(([, rect]) => tile.x >= rect.x && tile.y >= rect.y && tile.x < rect.x + rect.width && tile.y < rect.y + rect.height)?.[0];
  };

  plan.onHover((tile) => {
    const level = levelNow();
    const here = shapes.filter((shape) => shape.kind === 'mark' && tile.x >= shape.x && tile.y >= shape.y && tile.x < shape.x + shape.width && tile.y < shape.y + shape.height).map((shape) => shape.label ?? '');
    if (level) {
      const found = districtAtLevelTile(wholeNow(), level, tile);
      readout.textContent = [`${tile.x},${tile.y}`, found ? `${found.districtId} ${found.local.x},${found.local.y}` : '', ...here].filter(Boolean).join(' · ');
      return;
    }
    const room = roomAt(tile);
    const rect = room ? districtNow()?.rooms?.[room] : undefined;
    readout.textContent = [`${tile.x},${tile.y}`, room && rect ? `${room} +${tile.x - rect.x},+${tile.y - rect.y}` : '', ...here].filter(Boolean).join(' · ');
  });
  plan.onClick((tile) => update({ focus: tile }));
  const localOf = (tile: TilePoint): { readonly districtId: DistrictId; readonly local: TilePoint } | null => {
    const level = levelNow();
    if (!level) return { districtId: controller.district, local: tile };
    const found = districtAtLevelTile(wholeNow(), level, tile);
    return found ? { districtId: found.districtId, local: found.local } : null;
  };
  const modifiersOf = (event?: { shiftKey: boolean; ctrlKey: boolean; metaKey?: boolean }) => ({ shift: event?.shiftKey ?? false, ctrl: (event?.ctrlKey ?? false) || (event?.metaKey ?? false) });
  const editDown = (tile: TilePoint, modifiers: { shift: boolean; ctrl: boolean }): boolean => {
    const found = localOf(tile);
    if (!found) return false;
    const level = levelNow();
    if (level) controller.setDistrict(found.districtId);
    pointerOrigin = level ? originOf(level, found.districtId) : ORIGIN;
    controller.pointerDown(found.local, modifiers);
    return true;
  };
  const editMove = (tile: TilePoint): void => controller.pointerMove({ x: tile.x - pointerOrigin.x, y: tile.y - pointerOrigin.y });
  const editUp = (tile: TilePoint): void => controller.pointerUp({ x: tile.x - pointerOrigin.x, y: tile.y - pointerOrigin.y });
  plan.onPointer('down', (tile, event) => void editDown(tile, modifiersOf(event)));
  plan.onPointer('move', editMove);
  plan.onPointer('up', editUp);

  let hoverGhost: { readonly box: { x: number; y: number; width: number; height: number }; readonly ok: boolean; readonly entry: PaletteEntry } | null = null;
  let placeProblem = '';
  let checkedKey = '';
  const placementAt = (entry: PaletteEntry, tile: TilePoint): string => {
    const found = localOf(tile);
    if (!found) return 'That spot is outside every district.';
    const result = addEntry(editorDocument.layout(found.districtId), entry.collection, entry.entry, found.local);
    return result.ok ? '' : result.reason;
  };
  const showPlacement = (entry: PaletteEntry | null, tile: TilePoint | null): void => {
    if (!entry || !tile) {
      if (hoverGhost) {
        hoverGhost = null;
        placeProblem = '';
        checkedKey = '';
        refreshEditing();
      }
      return;
    }
    const key = `${entry.label}@${tile.x},${tile.y}`;
    if (key === checkedKey) return;
    checkedKey = key;
    placeProblem = placementAt(entry, tile);
    const size = footprintOf(entry);
    hoverGhost = { box: { x: tile.x, y: tile.y, width: size.width, height: size.height }, ok: placeProblem === '', entry };
    refreshEditing();
  };
  let catalogueDrag: PaletteEntry | null = null;

  preview3d.setEditPointer(null);
  const editPointer3d: EditPointer = {
    down: (tile, event) => {
      if (controller.tool === 'paint' || controller.tool === 'erase') return editDown(tile, modifiersOf(event));
      if (controller.tool !== 'select') return false;
      const found = localOf(tile);
      if (!found) return false;
      const top = hitsAt(editorDocument.layout(found.districtId), editorDocument.district(found.districtId), found.local)[0];
      if (top?.kind !== 'entry') return false;
      if (controller.selection?.kind !== 'entry' || found.districtId !== controller.district) controller.select(null);
      editDown(tile, modifiersOf(event));
      return controller.dragging;
    },
    move: editMove,
    up: editUp,
    click: (tile, event) => {
      if (!editDown(tile, modifiersOf(event))) return;
      editUp(tile);
      if (controller.tool !== 'add') showPlacement(null, null);
      else checkedKey = '';
    },
    hover: (tile) => showPlacement(controller.tool === 'add' ? controller.pending : null, tile),
  };

  preview.addEventListener('dragover', (event) => {
    if (!editing || !catalogueDrag) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    showPlacement(catalogueDrag, preview3d.tileAt(event.clientX, event.clientY));
  });
  preview.addEventListener('dragleave', (event) => {
    if (event.relatedTarget instanceof Node && preview.contains(event.relatedTarget)) return;
    showPlacement(null, null);
  });
  preview.addEventListener('drop', (event) => {
    const entry = catalogueDrag;
    if (!editing || !entry) return;
    event.preventDefault();
    const tile = preview3d.tileAt(event.clientX, event.clientY);
    showPlacement(null, null);
    if (!tile) return;
    controller.setPending(entry);
    if (editDown(tile, { shift: event.shiftKey, ctrl: false })) editUp(tile);
    if (controller.tool === 'add' && !event.shiftKey) controller.setPending(null);
  });

  const worldTools = element('div', { class: 'world-tools', hidden: '' });
  const worldName = element('span', { class: 'world-name' });
  const worldButton = (label: string, tip: string, run: () => void): HTMLButtonElement => {
    const button = element('button', { type: 'button', title: tip }, label);
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', run);
    return button;
  };
  worldTools.append(
    worldName,
    worldButton('Rotate', 'Turn it a quarter (R)', () => controller.key('r', {})),
    worldButton('Duplicate', 'Make a copy next to it (Ctrl+D)', () => controller.key('d', { ctrl: true })),
    worldButton('Delete', 'Remove it (Delete)', () => controller.key('Delete', {})),
  );
  preview.append(worldTools);
  preview3d.onFrame(() => {
    const anchor = editing && controller.selection?.kind === 'entry' && !controller.dragging ? preview3d.overlay.selectionAnchor() : null;
    const spot = anchor ? preview3d.project(anchor) : null;
    worldTools.hidden = !spot?.visible;
    if (!spot?.visible) return;
    const half = worldTools.offsetWidth / 2 + 6;
    const x = Math.min(Math.max(spot.x, half), Math.max(half, preview.clientWidth - half));
    const y = Math.max(spot.y, worldTools.offsetHeight + 6);
    worldTools.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  });

  const renderIssues = (): void => {
    issueList.replaceChildren();
    issuePanel.dataset.empty = String(issues.length === 0);
    if (issues.length === 0) {
      issueHeading.textContent = 'No issues: this map passes the world design checks.';
      return;
    }
    issueHeading.textContent = `${issues.length} issue${issues.length === 1 ? '' : 's'} to fix${issues.some((issue) => issue.tile) ? '. Click one to jump to it.' : ''}`;
    for (const issue of issues) {
      const item = element('li');
      if (issue.tile) {
        const tile = issue.tile;
        const jump = element('button', { type: 'button', title: 'Show this tile on the plan' });
        jump.append(element('span', { class: 'issue-tile' }, `${tile.x},${tile.y}`), issue.message);
        jump.addEventListener('click', () => update({ focus: tile }));
        item.append(jump);
      } else item.textContent = issue.message;
      issueList.append(item);
    }
  };

  const refreshPreview = (now: boolean): void => {
    const zoneNow = (): ActiveZone => {
      const level = levelNow();
      return level ? zoneOfLevel(wholeNow(), level) : previewZone(content, state.district);
    };
    if (now) {
      preview3d.show(zoneNow());
      preview3d.markIssues(issues.flatMap((issue) => (issue.tile ? [issue.tile] : [])));
    } else preview3d.queueUpdate(zoneNow);
  };

  const refreshTiles = (): void => {
    const level = levelNow();
    plan.setTiles(level ? tileImageOf(level) : null);
  };

  const selectionName = (): string => {
    const selection = controller.selection;
    if (selection?.kind !== 'entry') return '';
    const ref = selection.ref;
    if (ref.collection === 'anchors') return ref.name;
    const entry = (editorDocument.layout(controller.district)[ref.collection] as readonly Record<string, unknown>[])[ref.index];
    if (!entry) return '';
    const id = entry.object ?? entry.npc ?? entry.creature ?? entry.prefab ?? entry.assembly ?? entry.kind;
    const known = typeof id === 'string' ? (base.worldObjects.get(id)?.name ?? base.npcs.get(id)?.name ?? base.creatures.get(id)?.name) : undefined;
    return known ?? (typeof id === 'string' ? id : ref.collection === 'lights' ? 'Light' : ref.collection);
  };

  let refreshQueued = 0;
  const refreshEditing = (): void => {
    if (refreshQueued) return;
    refreshQueued = window.requestAnimationFrame(() => {
      refreshQueued = 0;
      refreshEditingNow();
    });
  };

  const draggedModel = (): { readonly key: string; build(): Object3D | null } | undefined => {
    const selection = controller.selection;
    if (selection?.kind !== 'entry' || selection.ref.collection === 'anchors') return undefined;
    const collection = selection.ref.collection;
    const entry = (editorDocument.layout(controller.district)[collection] as readonly Record<string, unknown>[])[selection.ref.index];
    if (!entry) return undefined;
    const key = `drag:${collection}:${JSON.stringify(entry)}`;
    return { key, build: () => modelOf({ collection, label: key, entry }) };
  };

  const draggedInstance = (): string | null => {
    const selection = controller.selection;
    if (selection?.kind !== 'entry' || selection.ref.collection !== 'objects') return null;
    const id = editorDocument.layout(controller.district).objects[selection.ref.index]?.id;
    return typeof id === 'string' ? id : null;
  };

  const refreshEditingNow = (): void => {
    if (hoverGhost && !catalogueDrag && controller.tool !== 'add') {
      hoverGhost = null;
      placeProblem = '';
      checkedKey = '';
    }
    editToggle.setAttribute('aria-pressed', String(editing));
    tools.hidden = !editing;
    side.hidden = !editing;
    views.dataset.editing = String(editing);
    plan.setEditing(editing);
    for (const button of toolButtons) button.setAttribute('aria-pressed', String(controller.tool === button.dataset.tool));
    views.dataset.tool = controller.tool;
    brushLabel.hidden = controller.tool !== 'paint';
    palette.setActive(controller.tool === 'add' ? controller.pending : null);
    undo.disabled = !editorDocument.canUndo();
    redo.disabled = !editorDocument.canRedo();
    const unsaved = editorDocument.dirtyIds();
    const districtName = (id: DistrictId): string => base.districts.get(id)?.name ?? id;
    dirty.textContent = unsaved.length === 0 ? 'All changes saved' : `Unsaved changes in ${unsaved.map(districtName).join(', ')}`;
    dirty.dataset.unsaved = String(unsaved.length > 0);
    editToggle.dataset.unsaved = String(unsaved.length > 0);
    save.disabled = unsaved.length === 0;
    save.textContent = unsaved.length > 1 ? `Save all (${unsaved.length})` : 'Save';
    const buildError = editorDocument.buildError(controller.district);
    const problem = buildError ?? (controller.status || '');
    const hint = (): string => {
      if (controller.tool === 'add' && controller.pending) return `Click the plan to place ${controller.pending.name ?? controller.pending.label}. Shift+click to place more; Esc to stop.`;
      if (controller.tool === 'paint') return `Drag across the plan to paint ${brush.value}. Ctrl+Z undoes a whole stroke.`;
      if (controller.tool === 'erase') return 'Drag across the plan to remove painted tiles.';
      const where = inLevel() ? ` Editing ${districtName(controller.district)}; clicks pick the district under the pointer.` : '';
      if (controller.selection) return `Drag or use the arrow keys to move it. R rotates, Ctrl+D duplicates, Delete removes, Esc deselects.${where}`;
      return `Click anything on the plan to select it, or pick something to add from the panel on the right.${where}`;
    };
    banner.textContent = problem || notice || hint();
    banner.dataset.kind = problem ? 'error' : notice ? 'ok' : '';
    const layout = editorDocument.layout(controller.district);
    const district = editorDocument.district(controller.district);
    const origin = editOrigin();
    const local = editing && controller.selection ? boundsOf(layout, district, controller.selection) : null;
    const shift = <T extends { x: number; y: number }>(box: T | null): T | null => (box ? { ...box, x: box.x + origin.x, y: box.y + origin.y } : null);
    plan.showSelection(shift(local), shift(controller.ghost));
    preview3d.setEditPointer(editing ? editPointer3d : null);
    preview3d.overlay.showSelection(shift(local), controller.selection?.kind === 'entry');
    const dragGhost = shift(controller.ghost);
    preview3d.hideObject(dragGhost ? draggedInstance() : null);
    if (dragGhost) preview3d.overlay.showGhost(dragGhost, true, draggedModel());
    else if (editing && hoverGhost) {
      const ghostEntry = hoverGhost.entry;
      preview3d.overlay.showGhost(hoverGhost.box, hoverGhost.ok, { key: ghostEntry.label, build: () => modelOf(ghostEntry) });
    } else preview3d.overlay.showGhost(null, true);
    worldName.textContent = selectionName();
    if (editing && hoverGhost) {
      const name = hoverGhost.entry.name ?? hoverGhost.entry.label;
      banner.textContent = placeProblem ? `Can't place ${name} here: ${placeProblem.replace(/^Cannot place there: /, '')}` : catalogueDrag ? `Drop to place ${name}.` : `Click to place ${name}. Shift+click to place more; Esc to stop.`;
      banner.dataset.kind = placeProblem ? 'error' : '';
    }
    properties.render(layout);
  };

  let shownScope = '';
  let shownLayers = '';
  let shownRoom: string | undefined;

  function update(change: Partial<ViewState>): void {
    const scopeOf = (view: ViewState): string => view.level ?? view.district;
    const before = scopeOf(state);
    state = { ...state, ...change };
    if (scopeOf(state) !== before) {
      const { room: _room, focus: _focus, ...rest } = state;
      state = rest;
      if (!state.level) controller.setDistrict(state.district);
    }
    render();
  }

  function render(): void {
    history.replaceState(null, '', writeViewState(state));
    const level = levelNow();
    scopeSelect.value = level ? `${LEVEL_PREFIX}${level.id}` : state.district;
    const district = districtNow();
    roomSelect.hidden = Boolean(level);
    roomSelect.replaceChildren(element('option', { value: '' }, 'Whole district'), ...Object.keys(district?.rooms ?? {}).map((room) => element('option', { value: room }, room)));
    roomSelect.value = state.room ?? '';
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    views.dataset.view = state.view;
    for (const [layer, input] of layerInputs) input.checked = state.layers.includes(layer);
    preview3d.showActors(state.layers.includes('npcs'));
    const scope = state.level ?? state.district;
    const layersKey = state.layers.join(',');
    if (scope !== shownScope || layersKey !== shownLayers) {
      const fresh = scope !== shownScope;
      if (fresh) computeIssues();
      computeShapes();
      shownScope = scope;
      shownLayers = layersKey;
      if (fresh) {
        renderIssues();
        refreshTiles();
        plan.show([]);
        refreshPreview(true);
        cameraKey = '';
      }
    }
    plan.show(shapes, state.focus);
    if (state.room !== shownRoom) {
      shownRoom = state.room;
      const rect = state.room === undefined ? undefined : district?.rooms?.[state.room];
      if (rect && !level) plan.fitRect(rect);
    }
    plan.mark(state.focus ?? null);
    if (cameraKeyOf(state) !== cameraKey) {
      cameraKey = cameraKeyOf(state);
      const roomRect = level || state.room === undefined ? undefined : district?.rooms?.[state.room];
      preview3d.look(state.focus || !roomRect ? state : { ...state, focus: { x: roomRect.x + Math.floor(roomRect.width / 2), y: roomRect.y + Math.floor(roomRect.height / 2) } });
    }
    refreshEditing();
  }

  let planQueued = 0;
  editorDocument.onChange((id) => {
    content = services.liveContent();
    whole = null;
    if (!inLevel() && id !== state.district) {
      refreshEditing();
      return;
    }
    planQueued ||= window.requestAnimationFrame(() => {
      planQueued = 0;
      computeShapes();
      if (inLevel()) refreshTiles();
      plan.show(shapes);
    });
    refreshPreview(false);
    refreshEditing();
  });
  controller.onChange(refreshEditing);

  const runChecks = (): void => {
    banner.textContent = 'Checking…';
    window.setTimeout(() => {
      services.refreshChecks();
      whole = null;
      computeIssues();
      computeShapes();
      renderIssues();
      plan.show(shapes);
      preview3d.markIssues(issues.flatMap((issue) => (issue.tile ? [issue.tile] : [])));
      refreshEditing();
    }, 20);
  };

  const saveAll = async (): Promise<void> => {
    const ids = editorDocument.dirtyIds();
    if (ids.length === 0) return;
    banner.textContent = `Saving ${ids.join(', ')}…`;
    const failures: string[] = [];
    const saved: string[] = [];
    for (const id of ids) {
      const layout = editorDocument.layout(id);
      const outcome = await saveDistrict(id, layout);
      if (outcome.ok) {
        editorDocument.markSaved(id, layout);
        saved.push(base.districts.get(id)?.name ?? id);
      } else failures.push(`Could not save ${id}: ${outcome.error}`);
    }
    controller.status = failures.join(' · ');
    if (saved.length > 0) announce(`Saved ${saved.join(', ')}.`);
    runChecks();
  };

  editToggle.addEventListener('click', () => {
    editing = !editing;
    if (!editing) controller.select(null);
    refreshEditing();
  });
  undo.addEventListener('click', () => controller.key('z', { ctrl: true }));
  redo.addEventListener('click', () => controller.key('z', { ctrl: true, shift: true }));
  check.addEventListener('click', runChecks);
  save.addEventListener('click', () => void saveAll());

  window.addEventListener('keydown', (event) => {
    if (isTyping(event.target) || help.open) return;
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
    if (plain && (event.key === '?' || (event.code === 'Slash' && event.shiftKey))) {
      event.preventDefault();
      toggleHelp();
      return;
    }
    if (plain && event.key.toLowerCase() === 'f' && !event.shiftKey) {
      plan.fit();
      return;
    }
    if (!editing) return;
    if (plain && event.key === '/') {
      event.preventDefault();
      palette.focus();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void saveAll();
      return;
    }
    if (controller.key(event.key, { ctrl: event.ctrlKey || event.metaKey, shift: event.shiftKey })) event.preventDefault();
  });
  window.addEventListener('beforeunload', (event) => {
    if (editorDocument.dirtyIds().length > 0) event.preventDefault();
  });

  scopeSelect.addEventListener('change', () => {
    const value = scopeSelect.value;
    if (value.startsWith(LEVEL_PREFIX)) update({ level: value.slice(LEVEL_PREFIX.length) as LevelId });
    else {
      const { level: _level, ...rest } = state;
      state = rest;
      update({ district: value });
    }
  });
  roomSelect.addEventListener('change', () => {
    const room = roomSelect.value;
    const rect = room === '' ? undefined : districtNow()?.rooms?.[room];
    if (!rect) {
      const { room: _room, ...rest } = state;
      state = rest;
      render();
      return;
    }
    update({ room, focus: { x: rect.x + Math.floor(rect.width / 2), y: rect.y + Math.floor(rect.height / 2) } });
  });

  render();
}

export function startViewer(root: HTMLElement): void {
  const editorDocument = new EditorDocument(LAYOUT_SOURCES);
  const touched = new Set<DistrictId>();
  editorDocument.onChange((id) => touched.add(id));
  const edits = (): Map<DistrictId, EditedDistrict> => new Map([...touched].map((id) => [id, { district: editorDocument.district(id), layout: editorDocument.layout(id) }]));
  let messages: readonly string[] = findContentIssues(GAME_CONTENT);
  const services: ViewerServices = {
    base: GAME_CONTENT,
    document: editorDocument,
    liveContent: () =>
      touched.size === 0 ? GAME_CONTENT : { ...GAME_CONTENT, districts: new Map([...GAME_CONTENT.districts, ...[...touched].map((id) => [id, editorDocument.district(id)] as const)]) },
    wholeContent: () => contentWith(GAME_CONTENT, edits()),
    messages: () => messages,
    refreshChecks: () => {
      messages = findContentIssues(contentWith(GAME_CONTENT, edits()));
    },
  };
  start(root, services);
}

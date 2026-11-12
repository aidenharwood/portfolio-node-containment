import { findContentIssues, GAME_CONTENT, issuesFromMessages, LAYOUT_CHOICES, LAYOUT_SOURCES, type DistrictId, type GameContent, type PlanIssue, type TileKindId, type TilePoint } from '@containment/shared';
import { EditorDocument } from './document.ts';
import { EditController, type Tool } from './editController.ts';
import { contentWith, type EditedDistrict } from './contentWith.ts';
import { boundsOf } from './hitTest.ts';
import { Palette, paletteEntries } from './palette.ts';
import { PlanCanvas, planDrawList, type PlanShape } from './planCanvas.ts';
import { previewZone } from './previewLevel.ts';
import { PreviewView } from './previewView.ts';
import { PropertiesPanel } from './propertiesPanel.ts';
import { saveDistrict } from './saveClient.ts';
import { PLAN_LAYERS, readViewState, writeViewState, type PlanLayer, type ViewState } from './viewState.ts';

const PREVIEW_DELAY_MS = 350;

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
  issuesFor(content: GameContent, districtId: DistrictId): PlanIssue[];
  check(): void;
}

function start(root: HTMLElement, services: ViewerServices): void {
  const { base, document: editorDocument } = services;
  const known = new Set([...base.districts.keys()].sort());
  let state: ViewState = readViewState(location.search, known);
  let editing = false;

  const bar = element('header', { class: 'bar' });
  const title = element('h1', {}, 'District editor');
  const districtSelect = element('select', { 'aria-label': 'District' });
  for (const id of known) districtSelect.append(element('option', { value: id }, base.districts.get(id)?.name ?? id));
  const roomSelect = element('select', { 'aria-label': 'Room' });
  const viewButtons = (['split', '2d', '3d'] as const).map((mode) => {
    const button = element('button', { type: 'button', 'data-view': mode }, mode === 'split' ? 'Split' : mode.toUpperCase());
    button.addEventListener('click', () => update({ view: mode }));
    return button;
  });
  const editToggle = element('button', { type: 'button', class: 'edit-toggle', 'aria-pressed': 'false' }, 'Edit');
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
  bar.append(title, districtSelect, roomSelect, ...viewButtons, editToggle, layerBox, readout);

  const tools = element('div', { class: 'tools', hidden: '' });
  const toolButtons = (['select', 'paint', 'erase'] as const).map((tool) => {
    const button = element('button', { type: 'button', 'data-tool': tool }, tool[0]!.toUpperCase() + tool.slice(1));
    button.addEventListener('click', () => {
      controller.setPending(null);
      controller.tool = tool;
      refreshEditing();
    });
    return button;
  });
  const brush = element('select', { 'aria-label': 'Paint tile' });
  brush.append(...LAYOUT_CHOICES.tiles.map((tile) => element('option', { value: tile }, tile)));
  brush.value = 'hazard';
  brush.addEventListener('change', () => {
    controller.brush = brush.value as TileKindId;
  });
  const undo = element('button', { type: 'button' }, 'Undo');
  const redo = element('button', { type: 'button' }, 'Redo');
  const check = element('button', { type: 'button' }, 'Check');
  const save = element('button', { type: 'button', class: 'save' }, 'Save');
  const dirty = element('span', { class: 'dirty' });
  const banner = element('div', { class: 'banner', role: 'status' });
  tools.append(...toolButtons, brush, undo, redo, check, save, dirty, banner);

  const views = element('main', { class: 'views' });
  const planHost = element('div');
  const canvas = element('canvas', { id: 'plan' });
  planHost.append(canvas);
  const preview = element('section', { id: 'preview', 'aria-label': '3D view' });
  const side = element('aside', { class: 'side', hidden: '' });
  views.append(planHost, preview, side);

  const issueList = element('ul', { class: 'issues', 'aria-label': 'Issues' });
  root.append(bar, tools, views, issueList);

  const plan = new PlanCanvas(canvas);
  const preview3d = new PreviewView(preview);
  const controller = new EditController(editorDocument, state.district);
  const properties = new PropertiesPanel(base, controller);
  const palette = new Palette(paletteEntries(base), (entry) => {
    controller.setPending(entry);
    refreshEditing();
  });
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

  let shapes: PlanShape[] = [];
  let issues: PlanIssue[] = [];
  let content = services.liveContent();
  let previewTimer = 0;

  const districtNow = () => content.districts.get(state.district);

  const roomAt = (tile: TilePoint): string | undefined => {
    const rooms = districtNow()?.rooms ?? {};
    return Object.entries(rooms).find(([, rect]) => tile.x >= rect.x && tile.y >= rect.y && tile.x < rect.x + rect.width && tile.y < rect.y + rect.height)?.[0];
  };

  plan.onHover((tile) => {
    const room = roomAt(tile);
    const rect = room ? districtNow()?.rooms?.[room] : undefined;
    const here = shapes.filter((shape) => shape.kind === 'mark' && tile.x >= shape.x && tile.y >= shape.y && tile.x < shape.x + shape.width && tile.y < shape.y + shape.height);
    readout.textContent = [`${tile.x},${tile.y}`, room && rect ? `${room} +${tile.x - rect.x},+${tile.y - rect.y}` : '', ...here.map((shape) => shape.label ?? '')].filter(Boolean).join(' · ');
  });
  plan.onClick((tile) => update({ focus: tile }));
  plan.onPointer('down', (tile, event) => controller.pointerDown(tile, { shift: event?.shiftKey ?? false, ctrl: event?.ctrlKey ?? false }));
  plan.onPointer('move', (tile) => controller.pointerMove(tile));
  plan.onPointer('up', (tile) => controller.pointerUp(tile));

  const renderIssues = (): void => {
    issueList.replaceChildren();
    if (issues.length === 0) {
      issueList.append(element('li', { class: 'clear' }, 'No issues'));
      return;
    }
    for (const issue of issues) {
      const item = element('li', {}, issue.tile ? `${issue.tile.x},${issue.tile.y}  ${issue.message}` : issue.message);
      if (issue.tile) {
        const tile = issue.tile;
        item.addEventListener('click', () => update({ focus: tile }));
      }
      issueList.append(item);
    }
  };

  const refreshPreview = (now: boolean): void => {
    window.clearTimeout(previewTimer);
    const run = (): void => {
      preview3d.show(previewZone(content, state.district));
      preview3d.markIssues(issues.flatMap((issue) => (issue.tile ? [issue.tile] : [])));
    };
    if (now) run();
    else previewTimer = window.setTimeout(run, PREVIEW_DELAY_MS);
  };

  const refreshEditing = (): void => {
    editToggle.setAttribute('aria-pressed', String(editing));
    tools.hidden = !editing;
    side.hidden = !editing;
    views.dataset.editing = String(editing);
    plan.setEditing(editing);
    for (const button of toolButtons) button.setAttribute('aria-pressed', String(controller.tool === button.dataset.tool));
    const unsaved = editorDocument.dirtyIds();
    dirty.textContent = unsaved.length === 0 ? 'All saved' : `Unsaved: ${unsaved.join(', ')}`;
    save.disabled = unsaved.length === 0;
    const buildError = editorDocument.buildError(state.district);
    banner.textContent = buildError ?? controller.status ?? '';
    banner.dataset.kind = buildError || controller.status ? 'error' : '';
    if (controller.tool === 'add' && controller.pending) banner.textContent = `Click the plan to place ${controller.pending.label}. Shift+click places more; Esc stops.`;
    const layout = editorDocument.layout(state.district);
    const district = editorDocument.district(state.district);
    const selected = editing && controller.selection ? boundsOf(layout, district, controller.selection) : null;
    plan.showSelection(selected, controller.ghost);
    properties.render(layout);
  };

  let shownDistrict = '';
  let shownLayers = '';
  let shownRoom: string | undefined;

  function update(change: Partial<ViewState>): void {
    const districtChanged = change.district !== undefined && change.district !== state.district;
    state = { ...state, ...change };
    if (districtChanged) {
      const { room: _room, focus: _focus, ...rest } = state;
      state = { ...rest, ...change };
      controller.setDistrict(state.district);
    }
    render();
  }

  function render(): void {
    history.replaceState(null, '', writeViewState(state));
    districtSelect.value = state.district;
    const district = districtNow();
    roomSelect.replaceChildren(element('option', { value: '' }, 'Whole district'), ...Object.keys(district?.rooms ?? {}).map((room) => element('option', { value: room }, room)));
    roomSelect.value = state.room ?? '';
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    views.dataset.view = state.view;
    for (const [layer, input] of layerInputs) input.checked = state.layers.includes(layer);
    preview3d.showActors(state.layers.includes('npcs'));
    const layersKey = state.layers.join(',');
    if (state.district !== shownDistrict || layersKey !== shownLayers) {
      const fresh = state.district !== shownDistrict;
      if (fresh) issues = services.issuesFor(content, state.district);
      shapes = planDrawList(content, state.district, state.layers, issues);
      shownDistrict = state.district;
      shownLayers = layersKey;
      if (fresh) {
        renderIssues();
        plan.show([]);
        refreshPreview(true);
        cameraKey = '';
      }
    }
    plan.show(shapes, state.focus);
    if (state.room !== shownRoom) {
      shownRoom = state.room;
      const rect = state.room === undefined ? undefined : district?.rooms?.[state.room];
      if (rect) plan.fitRect(rect);
    }
    plan.mark(state.focus ?? null);
    if (cameraKeyOf(state) !== cameraKey) {
      cameraKey = cameraKeyOf(state);
      const roomRect = state.room === undefined ? undefined : district?.rooms?.[state.room];
      preview3d.look(state.focus || !roomRect ? state : { ...state, focus: { x: roomRect.x + Math.floor(roomRect.width / 2), y: roomRect.y + Math.floor(roomRect.height / 2) } });
    }
    refreshEditing();
  }

  editorDocument.onChange((id) => {
    content = services.liveContent();
    if (id !== state.district) {
      refreshEditing();
      return;
    }
    shapes = planDrawList(content, state.district, state.layers, issues);
    plan.show(shapes);
    refreshPreview(false);
    refreshEditing();
  });
  controller.onChange(refreshEditing);

  const saveAll = async (): Promise<void> => {
    const ids = editorDocument.dirtyIds();
    if (ids.length === 0) return;
    banner.textContent = `Saving ${ids.join(', ')}…`;
    const failures: string[] = [];
    for (const id of ids) {
      const layout = editorDocument.layout(id);
      const outcome = await saveDistrict(id, layout);
      if (outcome.ok) editorDocument.markSaved(id, layout);
      else failures.push(`${id}: ${outcome.error}`);
    }
    controller.status = failures.join(' · ');
    services.check();
    refreshEditing();
  };

  editToggle.addEventListener('click', () => {
    editing = !editing;
    if (!editing) controller.select(null);
    refreshEditing();
  });
  undo.addEventListener('click', () => controller.key('z', { ctrl: true }));
  redo.addEventListener('click', () => controller.key('z', { ctrl: true, shift: true }));
  check.addEventListener('click', () => services.check());
  save.addEventListener('click', () => void saveAll());

  window.addEventListener('keydown', (event) => {
    if (!editing || isTyping(event.target)) return;
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

  districtSelect.addEventListener('change', () => update({ district: districtSelect.value }));
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

  services.check = () => {
    banner.textContent = 'Checking…';
    window.setTimeout(() => {
      issues = services.issuesFor(content, state.district);
      shapes = planDrawList(content, state.district, state.layers, issues);
      renderIssues();
      plan.show(shapes);
      preview3d.markIssues(issues.flatMap((issue) => (issue.tile ? [issue.tile] : [])));
      refreshEditing();
    }, 20);
  };

  render();
}

export function startViewer(root: HTMLElement): void {
  const editorDocument = new EditorDocument(LAYOUT_SOURCES);
  const touched = new Set<DistrictId>();
  editorDocument.onChange((id) => touched.add(id));
  let messages = findContentIssues(GAME_CONTENT);
  let checkedContent: GameContent = GAME_CONTENT;
  let checkedWhole: GameContent = GAME_CONTENT;
  const liveContent = (): GameContent =>
    touched.size === 0 ? GAME_CONTENT : { ...GAME_CONTENT, districts: new Map([...GAME_CONTENT.districts, ...[...touched].map((id) => [id, editorDocument.district(id)] as const)]) };
  const services: ViewerServices = {
    base: GAME_CONTENT,
    document: editorDocument,
    liveContent,
    issuesFor: (content, districtId) => {
      if (content !== checkedContent) {
        const edits = new Map<DistrictId, EditedDistrict>([...touched].map((id) => [id, { district: editorDocument.district(id), layout: editorDocument.layout(id) }]));
        checkedWhole = contentWith(GAME_CONTENT, edits);
        messages = findContentIssues(checkedWhole);
        checkedContent = content;
      }
      return issuesFromMessages(checkedWhole, districtId, messages);
    },
    check: () => undefined,
  };
  start(root, services);
}

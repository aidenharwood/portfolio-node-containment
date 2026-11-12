import { findContentIssues, GAME_CONTENT, issuesFromMessages, type GameContent, type PlanIssue, type TilePoint } from '@containment/shared';
import { PlanCanvas, planDrawList, type PlanShape } from './planCanvas.ts';
import { previewZone } from './previewLevel.ts';
import { PreviewView } from './previewView.ts';
import { PLAN_LAYERS, readViewState, writeViewState, type PlanLayer, type ViewState } from './viewState.ts';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
};

function start(root: HTMLElement, content: GameContent, issuesFor: (content: GameContent, districtId: string) => PlanIssue[]): void {
  const known = new Set([...content.districts.keys()].sort());
  let state: ViewState = readViewState(location.search, known);

  const bar = element('header', { class: 'bar' });
  const title = element('h1', {}, 'District viewer');
  const districtSelect = element('select', { 'aria-label': 'District' });
  for (const id of known) districtSelect.append(element('option', { value: id }, content.districts.get(id)?.name ?? id));
  const roomSelect = element('select', { 'aria-label': 'Room' });
  const viewButtons = (['split', '2d', '3d'] as const).map((mode) => {
    const button = element('button', { type: 'button', 'data-view': mode }, mode === 'split' ? 'Split' : mode.toUpperCase());
    button.addEventListener('click', () => update({ view: mode }));
    return button;
  });
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
  bar.append(title, districtSelect, roomSelect, ...viewButtons, layerBox, readout);

  const views = element('main', { class: 'views' });
  const planHost = element('div');
  const canvas = element('canvas', { id: 'plan' });
  planHost.append(canvas);
  const preview = element('section', { id: 'preview', 'aria-label': '3D view' });
  views.append(planHost, preview);

  const issueList = element('ul', { class: 'issues', 'aria-label': 'Issues' });
  root.append(bar, views, issueList);

  const plan = new PlanCanvas(canvas);
  const preview3d = new PreviewView(preview);
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

  const roomAt = (tile: TilePoint): string | undefined => {
    const rooms = content.districts.get(state.district)?.rooms ?? {};
    return Object.entries(rooms).find(([, rect]) => tile.x >= rect.x && tile.y >= rect.y && tile.x < rect.x + rect.width && tile.y < rect.y + rect.height)?.[0];
  };

  plan.onHover((tile) => {
    const room = roomAt(tile);
    const rect = room ? content.districts.get(state.district)?.rooms?.[room] : undefined;
    const here = shapes.filter((shape) => shape.kind === 'mark' && tile.x >= shape.x && tile.y >= shape.y && tile.x < shape.x + shape.width && tile.y < shape.y + shape.height);
    readout.textContent = [`${tile.x},${tile.y}`, room && rect ? `${room} +${tile.x - rect.x},+${tile.y - rect.y}` : '', ...here.map((shape) => shape.label ?? '')].filter(Boolean).join(' · ');
  });

  plan.onClick((tile) => update({ focus: tile }));

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

  let shownDistrict = '';
  let shownLayers = '';
  let shownRoom: string | undefined;

  function update(change: Partial<ViewState>): void {
    const districtChanged = change.district !== undefined && change.district !== state.district;
    state = { ...state, ...change };
    if (districtChanged) {
      const { room: _room, focus: _focus, ...rest } = state;
      state = { ...rest, ...change };
    }
    render();
  }

  function render(): void {
    history.replaceState(null, '', writeViewState(state));
    districtSelect.value = state.district;
    const district = content.districts.get(state.district);
    roomSelect.replaceChildren(element('option', { value: '' }, 'Whole district'), ...Object.keys(district?.rooms ?? {}).map((room) => element('option', { value: room }, room)));
    roomSelect.value = state.room ?? '';
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    views.dataset.view = state.view;
    for (const [layer, input] of layerInputs) input.checked = state.layers.includes(layer);
    const layersKey = state.layers.join(',');
    if (state.district !== shownDistrict || layersKey !== shownLayers) {
      const fresh = state.district !== shownDistrict;
      if (fresh) issues = issuesFor(content, state.district);
      shapes = planDrawList(content, state.district, state.layers, issues);
      shownDistrict = state.district;
      shownLayers = layersKey;
      if (fresh) {
        renderIssues();
        preview3d.markIssues(issues.flatMap((issue) => (issue.tile ? [issue.tile] : [])));
        plan.show([]);
        preview3d.show(previewZone(content, state.district));
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
  }

  districtSelect.addEventListener('change', () => update({ district: districtSelect.value }));
  roomSelect.addEventListener('change', () => {
    const room = roomSelect.value;
    const rect = room === '' ? undefined : content.districts.get(state.district)?.rooms?.[room];
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
  const messages = findContentIssues(GAME_CONTENT);
  start(root, GAME_CONTENT, (content, districtId) => issuesFromMessages(content, districtId, messages));
}

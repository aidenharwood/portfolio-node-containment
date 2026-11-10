import { lineIcon } from './skillIcons.ts';

export type PanelIconId = 'inventory' | 'equipment' | 'skills' | 'quests' | 'contracts' | 'bestiary' | 'social' | 'dossier';

const PANEL_ICON_PATHS: Readonly<Record<PanelIconId, readonly string[]>> = {
  inventory: ['M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11H5z', 'M9 6V4h6v2', 'M8 13h8', 'M12 13v3'],
  equipment: ['M8 3L4 6v14h16V6l-4-3', 'M8 3a4 4 0 0 0 8 0', 'M4 12h16'],
  skills: ['M4 20h16', 'M7 16v4', 'M12 11v9', 'M17 6v14'],
  quests: ['M12 6C10 4.5 7 4 4 4v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z', 'M12 6v14'],
  contracts: ['M9 3h6v3H9z', 'M9 4.5H5V21h14V4.5h-4', 'M9 14l2 2 4-4'],
  bestiary: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', 'M12 8c-1.2 1.3-1.2 6.7 0 8 1.2-1.3 1.2-6.7 0-8z'],
  social: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 20a6 6 0 0 1 12 0', 'M16 5a3 3 0 0 1 0 6', 'M18 14.5a6 6 0 0 1 3 5.5'],
  dossier: ['M3 5h18v14H3z', 'M10 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z', 'M5 16a3 3 0 0 1 6 0', 'M14 10h4', 'M14 14h4'],
};

export function panelIcon(id: PanelIconId): SVGSVGElement {
  return lineIcon(PANEL_ICON_PATHS[id], 'panel-tab-icon');
}

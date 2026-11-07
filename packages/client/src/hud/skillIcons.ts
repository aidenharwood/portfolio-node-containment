import type { SkillId } from '@containment/shared';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const SKILL_ICON_PATHS: Readonly<Record<SkillId, readonly string[]>> = {
  containment: ['M4 4h16v16H4z', 'M9 4v16', 'M15 4v16', 'M12 10l2 2-2 2-2-2z'],
  research: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.3 15.3L20 20', 'M8 10.5h5'],
  engineering: ['M14.5 4a4.5 4.5 0 0 0-4.2 6.1L4 16.4 7.6 20l6.3-6.3A4.5 4.5 0 0 0 20 9.5l-2.8 2.8-3.2-.3-.3-3.2L16.5 6a4.5 4.5 0 0 0-2-.5'],
  marksmanship: ['M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M12 2v6', 'M12 16v6', 'M2 12h6', 'M16 12h6'],
  closeQuarters: ['M18 3h3v3L9 18l-3-3z', 'M5 14l5 5', 'M7 17l-3 3'],
  fortitude: ['M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z', 'M12 8v8', 'M8 12h8'],
  salvage: ['M3 9h18v11H3z', 'M3 9l3-5h12l3 5', 'M10 13h4'],
  refining: ['M4 4h16l-6 8v6l-4 2v-8z'],
  biochemistry: ['M9 3h6', 'M10 3v6l-5 10a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-10V3', 'M7.5 15h9'],
};

export function skillIcon(id: SkillId): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'skill-icon');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of SKILL_ICON_PATHS[id]) {
    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

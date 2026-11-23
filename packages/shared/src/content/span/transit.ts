import type { TramLineDefinition, TramStationDefinition } from '../../world/tram.ts';
import { spanAnchor } from './districts.ts';

const station = (id: string, name: string, districtId: string, alwaysKnown = false): TramStationDefinition => ({
  id,
  name,
  districtId,
  areaId: 'tram-terminal',
  platform: spanAnchor(districtId, 'tramPlatform'),
  ...(alwaysKnown ? { alwaysKnown: true } : {}),
});

export const SPAN_TRAM_STATIONS: readonly TramStationDefinition[] = [
  station('kestrel-commons-station', 'Kestrel Commons', 'kestrel-commons', true),
  station('harrowgate-halt', 'Harrowgate Halt', 'harrowgate'),
  station('neon-row-station', 'Neon Row', 'neon-row'),
  station('rustwater-station', 'Rustwater', 'rustwater'),
  station('choir-halt', 'the Choir', 'the-choir'),
  station('last-post-funicular', 'Last Post', 'last-post'),
];

export const SPAN_TRAM_LINES: readonly TramLineDefinition[] = [
  { id: 'ring-line', name: 'Ring Line', color: '#4fd8ff', stations: ['kestrel-commons-station', 'harrowgate-halt', 'neon-row-station', 'rustwater-station', 'choir-halt'] },
  { id: 'spindle-funicular', name: 'Spindle Funicular', color: '#ffb347', stations: ['choir-halt', 'last-post-funicular'] },
];

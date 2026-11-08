import { GAME_CONTENT, type TramStationId } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';

export class TramRide {
  readonly element = h('div', { className: 'tram-ride', hidden: true, role: 'status', ariaLive: 'polite' });
  private readonly world: WorldState;
  private readonly unsubscribers: (() => void)[];

  constructor(connection: GameConnection, world: WorldState) {
    this.world = world;
    this.unsubscribers = [
      connection.on('tram.departed', ({ originStationId, destinationStationId, rideTicks }) => this.show(originStationId, destinationStationId, rideTicks)),
      connection.on('tram.arrived', () => this.hide()),
    ];
  }

  get isRiding(): boolean {
    return !this.element.hidden;
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private show(originStationId: TramStationId, destinationStationId: TramStationId, rideTicks: number): void {
    const network = GAME_CONTENT.tram;
    const origin = network.stations.get(originStationId);
    const destination = network.stations.get(destinationStationId);
    const line = network.lines.get(origin?.lineIds.find((lineId) => destination?.lineIds.includes(lineId)) ?? origin?.lineIds[0] ?? '');
    const progress = h('div', { className: 'tram-ride-progress' });
    progress.style.animationDuration = `${rideTicks * this.world.tickMs}ms`;
    replaceChildren(
      this.element,
      h('div', { className: 'tram-ride-window', style: { '--line-color': line?.color ?? '#4fd8ff' } },
        h('div', { className: 'tram-ride-tunnel' }),
        h('div', { className: 'tram-ride-mullion' }),
      ),
      h('div', { className: 'tram-ride-board' },
        h('p', { className: 'eyebrow' }, line?.name ?? 'Tram'),
        h('h2', {}, `Next stop: ${destination?.name ?? 'unknown'}`),
        h('p', { className: 'tram-ride-from' }, `Departed ${origin?.name ?? 'the platform'}`),
        h('div', { className: 'tram-ride-track' }, progress),
      ),
    );
    this.element.hidden = false;
  }

  private hide(): void {
    this.element.hidden = true;
  }
}

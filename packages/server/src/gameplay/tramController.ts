import {
  stationAt,
  TRAM_BOARDING_TICKS,
  tramBoardingRefusal,
  tramRideTicks,
  isStationKnown,
  tramStationFlag,
  tramStops,
  type GameContent,
  type NoticeTone,
  type TramStation,
  type TramStationId,
  type WorldLocation,
} from '@containment/shared';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';

export interface TramHost {
  notify(player: Player, tone: NoticeTone, text: string): void;
  sendActivity(player: Player, label: string | null, ticksPerAction?: number, remaining?: number | null): void;
  teleport(player: Player, location: WorldLocation): void;
  withdrawFromCombat(player: Player): void;
}

export class TramController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly host: TramHost;

  constructor(content: GameContent, world: World, host: TramHost) {
    this.content = content;
    this.world = world;
    this.host = host;
  }

  openMap(player: Player): void {
    const station = this.stationUnder(player);
    if (!station) {
      this.host.notify(player, 'warning', 'This stop is not in service.');
      return;
    }
    this.discover(player, station.id);
    player.send({ type: 'tram.mapOpened', stationId: station.id });
  }

  discover(player: Player, stationId: TramStationId): void {
    const station = this.content.tram.stations.get(stationId);
    if (!station || !player.addFlag(tramStationFlag(station.id))) return;
    this.host.notify(player, 'success', `Tram station found: ${station.name}. You can ride here from any platform you know.`);
  }

  discoverByArea(player: Player, districtId: string, areaId: string): void {
    for (const station of this.content.tram.stations.values()) {
      if (station.districtId === districtId && station.areaId === areaId) this.discover(player, station.id);
    }
  }

  board(player: Player, destinationStationId: TramStationId, tick: number): void {
    if (player.activity?.kind === 'tram') return;
    const origin = this.stationUnder(player);
    const refusal = tramBoardingRefusal(this.content.tram, {
      origin,
      destinationId: destinationStationId,
      knowsStation: (stationId) => isStationKnown(this.content.tram, stationId, (flag) => player.hasFlag(flag)),
    });
    if (refusal || !origin) {
      this.host.notify(player, 'warning', refusal ?? 'You need to be standing on a tram platform.');
      return;
    }
    const destination = this.content.tram.stations.get(destinationStationId) as TramStation;
    const stops = tramStops(this.content.tram, origin.id, destination.id) ?? 1;
    player.path = [];
    player.pendingInteraction = null;
    player.activity = {
      kind: 'tram',
      stage: 'boarding',
      originStationId: origin.id,
      destinationStationId: destination.id,
      rideTicks: tramRideTicks(stops),
      dueTick: tick + TRAM_BOARDING_TICKS,
    };
    this.host.sendActivity(player, `Boarding the ${this.lineName(origin, destination)} to ${destination.name}`, TRAM_BOARDING_TICKS);
  }

  cancelBoarding(player: Player): boolean {
    if (player.activity?.kind !== 'tram' || player.activity.stage !== 'boarding') return false;
    player.activity = null;
    this.host.sendActivity(player, null);
    return true;
  }

  pendingArrival(player: Player): WorldLocation | null {
    const activity = player.activity;
    if (activity?.kind !== 'tram' || activity.stage !== 'riding') return null;
    return this.arrivalOf(activity.destinationStationId);
  }

  tick(tick: number): void {
    for (const level of this.world.instances()) {
      for (const player of [...level.players.values()]) {
        const activity = player.activity;
        if (activity?.kind !== 'tram' || tick < activity.dueTick) continue;
        if (activity.stage === 'boarding') this.depart(player, tick);
        else this.arrive(player, activity.destinationStationId);
      }
    }
  }

  private depart(player: Player, tick: number): void {
    const activity = player.activity;
    if (activity?.kind !== 'tram') return;
    if (this.stationUnder(player)?.id !== activity.originStationId) {
      this.cancelBoarding(player);
      return;
    }
    player.activity = { ...activity, stage: 'riding', dueTick: tick + activity.rideTicks };
    this.host.withdrawFromCombat(player);
    this.host.sendActivity(player, null);
    player.send({
      type: 'tram.departed',
      originStationId: activity.originStationId,
      destinationStationId: activity.destinationStationId,
      rideTicks: activity.rideTicks,
    });
  }

  private arrive(player: Player, stationId: TramStationId): void {
    player.activity = null;
    const arrival = this.arrivalOf(stationId);
    if (arrival) this.host.teleport(player, arrival);
    player.send({ type: 'tram.arrived', stationId });
  }

  private arrivalOf(stationId: TramStationId): WorldLocation | null {
    const station = this.content.tram.stations.get(stationId);
    return station ? { levelId: station.levelId, position: station.platformPoint } : null;
  }

  private stationUnder(player: Player): TramStation | undefined {
    const level = this.world.findLevelOf(player);
    return level ? stationAt(this.content.tram, level.id, player.position) : undefined;
  }

  private lineName(origin: TramStation, destination: TramStation): string {
    const shared = origin.lineIds.find((lineId) => destination.lineIds.includes(lineId)) ?? origin.lineIds[0];
    return (shared && this.content.tram.lines.get(shared)?.name) ?? 'tram';
  }
}

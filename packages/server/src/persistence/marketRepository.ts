import type { MarketOrder, MarketOrderId } from '@containment/shared';
import type { MarketStore } from '../gameplay/marketController.ts';
import type { Database } from './database.ts';
import { retireSealOrder } from '../characters/retiredSeals.ts';

export class MarketRepository implements MarketStore {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  load(): MarketOrder[] {
    const rows = this.database.prepare('SELECT record FROM market_orders').all() as { record: string }[];
    return rows.map((row) => retireSealOrder(JSON.parse(row.record) as MarketOrder));
  }

  save(order: MarketOrder): void {
    this.database
      .prepare('INSERT INTO market_orders (id, owner_id, record) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET record = excluded.record')
      .run(order.id, order.ownerId, JSON.stringify(order));
  }

  remove(orderId: MarketOrderId): void {
    this.database.prepare('DELETE FROM market_orders WHERE id = ?').run(orderId);
  }
}

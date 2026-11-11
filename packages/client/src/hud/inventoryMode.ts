import type { ItemDefinition } from '@containment/shared';
import type { MenuAction } from './contextMenu.ts';

export interface InventoryMode {
  readonly hint: string;
  accepts(item: ItemDefinition): boolean;
  primary(slotIndex: number, item: ItemDefinition, all: boolean): void;
  actions(slotIndex: number, item: ItemDefinition): MenuAction[];
}

export class InventoryModeSlot {
  private mode: InventoryMode | null = null;
  private readonly listeners = new Set<(mode: InventoryMode | null) => void>();

  get current(): InventoryMode | null {
    return this.mode;
  }

  enter(mode: InventoryMode): void {
    this.mode = mode;
    this.listeners.forEach((listener) => listener(mode));
  }

  leave(mode: InventoryMode): void {
    if (this.mode !== mode) return;
    this.mode = null;
    this.listeners.forEach((listener) => listener(null));
  }

  onChange(listener: (mode: InventoryMode | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

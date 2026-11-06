import type { ShopDefinition } from '../economy/shop.ts';

export const SHOPS: readonly ShopDefinition[] = [
  {
    id: 'medbay',
    name: 'Atrium Medbay',
    greeting: 'Prescriptions are for people with paperwork. Everyone else pays scrip.',
    listings: [
      { itemId: 'medgel', price: 6 },
      { itemId: 'sap-poultice', price: 16 },
      { itemId: 'trauma-foam', price: 26 },
    ],
    buysCategories: ['material', 'consumable'],
    sellRate: 0.5,
  },
  {
    id: 'requisitions',
    name: 'Meridian Requisitions',
    greeting: 'Sign here, here and here. Scrip up front. No refunds on anything that has been inside a breach.',
    listings: [
      { itemId: 'medgel', price: 6 },
      { itemId: 'stun-baton', price: 45 },
      { itemId: 'dart-pistol', price: 35 },
      { itemId: 'containment-gloves', price: 40 },
      { itemId: 'hazard-visor', price: 50 },
      { itemId: 'field-vest-mk1', price: 60 },
      { itemId: 'kestrel-sidearm', price: 180 },
      { itemId: 'response-helmet', price: 220 },
    ],
    buysCategories: ['material', 'equipment', 'consumable'],
    sellRate: 0.5,
  },
  {
    id: 'undercroft-swap',
    name: 'Undercroft Swap',
    greeting: "Everything here fell off something. Some of it was still attached at the time. Scrip or salvage, I'm not fussy.",
    listings: [
      { itemId: 'medgel', price: 7 },
      { itemId: 'filter-respirator', price: 120 },
      { itemId: 'shock-maul', price: 260 },
      { itemId: 'marksman-carbine', price: 320 },
      { itemId: 'composite-plate', price: 300 },
    ],
    buysCategories: ['material', 'equipment', 'consumable'],
    sellRate: 0.6,
  },
];

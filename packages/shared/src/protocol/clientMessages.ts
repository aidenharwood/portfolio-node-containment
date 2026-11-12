import { z } from 'zod';
import { AUGMENTS, BODY_TYPES, FACE_MARKS, HAIR_STYLES, PHYSIQUES } from '../character/appearance.ts';
import { PRONOUN_SET_IDS } from '../character/pronouns.ts';
import { CONTRACT_CADENCES } from '../contracts/contract.ts';
import { EQUIPMENT_SLOTS } from '../gear/slots.ts';

export const CREDENTIAL_RULES = {
  usernamePattern: /^[A-Za-z0-9_]{3,20}$/,
  passwordMinimumLength: 8,
  passwordMaximumLength: 128,
} as const;

const tilePointSchema = z.object({
  x: z.number().int().min(0).max(1024),
  y: z.number().int().min(0).max(1024),
});

const appearanceSchema = z.object({
  physique: z.enum(PHYSIQUES),
  bodyType: z.enum(BODY_TYPES),
  height: z.number().min(0).max(2),
  skinTone: z.string().max(16),
  hairStyle: z.enum(HAIR_STYLES),
  hairColor: z.string().max(16),
  eyeColor: z.string().max(16),
  faceMark: z.enum(FACE_MARKS),
  augment: z.enum(AUGMENTS),
});

export const characterDraftSchema = z.object({
  name: z.string().max(64),
  pronouns: z.enum(PRONOUN_SET_IDS),
  appearance: appearanceSchema,
});

const credentialsSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth.register'), ...credentialsSchema.shape }),
  z.object({ type: z.literal('auth.login'), ...credentialsSchema.shape }),
  z.object({ type: z.literal('auth.resume'), token: z.string().min(16).max(256) }),
  z.object({ type: z.literal('auth.logout') }),
  z.object({ type: z.literal('character.create'), draft: characterDraftSchema }),
  z.object({ type: z.literal('character.select'), characterId: z.string().max(64) }),
  z.object({ type: z.literal('character.leaveWorld') }),
  z.object({ type: z.literal('character.delete'), characterId: z.string().max(64), confirmName: z.string().max(64) }),
  z.object({ type: z.literal('world.walk'), target: tilePointSchema }),
  z.object({
    type: z.literal('world.interact'),
    targetKind: z.enum(['npc', 'object', 'creature']),
    instanceId: z.string().max(64),
    interactionIndex: z.number().int().min(0).max(16),
  }),
  z.object({ type: z.literal('dialogue.continue') }),
  z.object({ type: z.literal('dialogue.choose'), optionIndex: z.number().int().min(0).max(16) }),
  z.object({ type: z.literal('dialogue.close') }),
  z.object({ type: z.literal('inventory.equip'), slotIndex: z.number().int().min(0).max(64) }),
  z.object({ type: z.literal('inventory.use'), slotIndex: z.number().int().min(0).max(64) }),
  z.object({ type: z.literal('inventory.drop'), slotIndex: z.number().int().min(0).max(64) }),
  z.object({ type: z.literal('inventory.destroy'), slotIndex: z.number().int().min(0).max(64) }),
  z.object({ type: z.literal('world.pickup'), groundItemId: z.string().max(64) }),
  z.object({ type: z.literal('inventory.swap'), from: z.number().int().min(0).max(64), to: z.number().int().min(0).max(64) }),
  z.object({ type: z.literal('equipment.unequip'), slot: z.enum(EQUIPMENT_SLOTS) }),
  z.object({ type: z.literal('chat.say'), text: z.string().min(1).max(160), channel: z.enum(['local', 'party', 'site']).optional() }),
  z.object({ type: z.literal('chat.whisper'), to: z.string().min(1).max(64), text: z.string().min(1).max(160) }),
  z.object({ type: z.literal('party.invite'), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal('party.accept'), inviterId: z.string().max(64) }),
  z.object({ type: z.literal('party.decline'), inviterId: z.string().max(64) }),
  z.object({ type: z.literal('party.leave') }),
  z.object({ type: z.literal('party.kick'), characterId: z.string().max(64) }),
  z.object({ type: z.literal('party.promote'), characterId: z.string().max(64) }),
  z.object({ type: z.literal('friends.add'), name: z.string().min(1).max(64) }),
  z.object({ type: z.literal('friends.remove'), characterId: z.string().max(64) }),
  z.object({ type: z.literal('contracts.claim'), cadence: z.enum(CONTRACT_CADENCES), contractId: z.string().max(64) }),
  z.object({ type: z.literal('contracts.close') }),
  z.object({ type: z.literal('shop.open'), shopId: z.string().max(64), keeperInstanceId: z.string().max(64).nullable() }),
  z.object({ type: z.literal('shop.buy'), itemId: z.string().max(64), quantity: z.number().int().min(1).max(1000) }),
  z.object({ type: z.literal('shop.sell'), slotIndex: z.number().int().min(0).max(64), quantity: z.number().int().min(1).max(10000) }),
  z.object({ type: z.literal('shop.close') }),
  z.object({ type: z.literal('crafting.make'), recipeId: z.string().max(64), quantity: z.number().int().min(1).max(1000) }),
  z.object({ type: z.literal('crafting.close') }),
  z.object({ type: z.literal('storage.deposit'), slotIndex: z.number().int().min(0).max(64), quantity: z.number().int().min(1).max(2_000_000_000) }),
  z.object({ type: z.literal('storage.depositAll') }),
  z.object({ type: z.literal('storage.withdraw'), itemId: z.string().max(64), quantity: z.number().int().min(1).max(2_000_000_000) }),
  z.object({ type: z.literal('storage.close') }),
  z.object({
    type: z.literal('market.place'),
    side: z.enum(['buy', 'sell']),
    itemId: z.string().max(64),
    price: z.number().int().min(1).max(1_000_000_000),
    quantity: z.number().int().min(1).max(1_000_000),
  }),
  z.object({ type: z.literal('market.cancel'), orderId: z.string().max(64) }),
  z.object({ type: z.literal('market.collect'), orderId: z.string().max(64).nullable() }),
  z.object({ type: z.literal('market.close') }),
  z.object({ type: z.literal('tram.board'), destinationStationId: z.string().max(64) }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export type ClientMessageType = ClientMessage['type'];

export type ClientMessageOf<T extends ClientMessageType> = Extract<ClientMessage, { type: T }>;

import type { CharacterId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';

export const FRIEND_LIMIT = 50;

export interface FriendEntry {
  readonly characterId: CharacterId;
  readonly name: string;
}

export interface FriendView extends FriendEntry {
  readonly online: boolean;
  readonly districtName: string | null;
}

export function addFriend(friends: readonly FriendEntry[], self: CharacterId, entry: FriendEntry): Result<readonly FriendEntry[]> {
  if (entry.characterId === self) return failure('You cannot add yourself as a contact.');
  if (friends.some((friend) => friend.characterId === entry.characterId)) return failure(`${entry.name} is already on your contacts list.`);
  if (friends.length >= FRIEND_LIMIT) return failure(`Your contacts list is full (${FRIEND_LIMIT}).`);
  return success([...friends, entry].sort((a, b) => a.name.localeCompare(b.name)));
}

export const removeFriend = (friends: readonly FriendEntry[], characterId: CharacterId): readonly FriendEntry[] =>
  friends.filter((friend) => friend.characterId !== characterId);

export const renameFriend = (friends: readonly FriendEntry[], characterId: CharacterId, name: string): readonly FriendEntry[] =>
  friends.map((friend) => (friend.characterId === characterId && friend.name !== name ? { ...friend, name } : friend));

export type ChatCommand =
  | { readonly kind: 'say'; readonly channel: 'local' | 'party' | 'site'; readonly text: string }
  | { readonly kind: 'whisper'; readonly to: string; readonly text: string }
  | { readonly kind: 'reply'; readonly text: string }
  | { readonly kind: 'invite'; readonly name: string }
  | { readonly kind: 'friend'; readonly name: string }
  | { readonly kind: 'leaveParty' }
  | { readonly kind: 'help' }
  | { readonly kind: 'unknown'; readonly command: string };

export const CHAT_HELP = [
  '/p message: party chat',
  '/s message: site-wide chat',
  '/w "Name" message: whisper (quotes optional for one-word names)',
  '/r message: reply to your last whisper',
  '/invite Name: invite to your party',
  '/friend Name: add a contact',
  '/leave: leave your party',
] as const;

function splitTarget(rest: string): { readonly target: string; readonly text: string } {
  const quoted = /^"([^"]+)"\s*(.*)$/.exec(rest);
  if (quoted) return { target: quoted[1]!.trim(), text: quoted[2]!.trim() };
  const space = rest.indexOf(' ');
  return space < 0 ? { target: rest, text: '' } : { target: rest.slice(0, space), text: rest.slice(space + 1).trim() };
}

const unquoted = (value: string): string => value.trim().replace(/^"(.*)"$/, '$1').trim();

export function parseChatInput(raw: string): ChatCommand | null {
  const input = raw.trim();
  if (!input) return null;
  if (!input.startsWith('/')) return { kind: 'say', channel: 'local', text: input };
  const space = input.indexOf(' ');
  const command = (space < 0 ? input.slice(1) : input.slice(1, space)).toLowerCase();
  const rest = space < 0 ? '' : input.slice(space + 1).trim();
  switch (command) {
    case 'p':
    case 'party':
      return rest ? { kind: 'say', channel: 'party', text: rest } : null;
    case 's':
    case 'site':
      return rest ? { kind: 'say', channel: 'site', text: rest } : null;
    case 'l':
    case 'local':
      return rest ? { kind: 'say', channel: 'local', text: rest } : null;
    case 'w':
    case 'whisper':
    case 'tell': {
      const { target, text } = splitTarget(rest);
      return target && text ? { kind: 'whisper', to: target, text } : null;
    }
    case 'r':
    case 'reply':
      return rest ? { kind: 'reply', text: rest } : null;
    case 'invite':
      return rest ? { kind: 'invite', name: unquoted(rest) } : null;
    case 'friend':
    case 'contact':
      return rest ? { kind: 'friend', name: unquoted(rest) } : null;
    case 'leave':
      return { kind: 'leaveParty' };
    case 'help':
    case '?':
      return { kind: 'help' };
    default:
      return { kind: 'unknown', command };
  }
}

export const whisperPrefix = (name: string): string => (name.includes(' ') ? `/w "${name}" ` : `/w ${name} `);

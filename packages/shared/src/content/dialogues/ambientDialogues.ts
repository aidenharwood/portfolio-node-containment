import type { DialogueDefinition } from '../../dialogue/dialogue.ts';

type Aside = readonly [question: string, answer: string];

const chatter = (key: string, greeting: string, asides: readonly Aside[]): DialogueDefinition => ({
  id: `ambient-${key}`,
  entries: [{ node: 'greeting' }],
  nodes: {
    greeting: {
      speaker: 'npc',
      text: greeting,
      options: [...asides.map(([question], index) => ({ text: question, next: `aside${index}` })), { text: 'Carry on.', next: null }],
    },
    ...Object.fromEntries(asides.map(([, answer], index) => [`aside${index}`, { speaker: 'npc' as const, text: answer, next: 'greeting' }])),
  },
});

export const AMBIENT_DIALOGUES: readonly DialogueDefinition[] = [
  chatter('staffer', "Don't mind me. I'm walking briskly so nobody gives me anything else to carry.", [
    ['What do you do here?', 'Whatever the rota says. This week it says "Atrium support, general". Last week it said "volunteer". I did not volunteer.'],
    ['Any news?', "Facilities have taped off half the floor again. They say it's for expansion. They said that about the last bit, and now there's a whole wing there."],
  ]),
  chatter('operative', "Off shift. If something's on fire, find Kade. If something's knocking, find someone braver.", [
    ['Seen much action?', "Enough to sleep with my boots on. The first week was the worst. Now it's just... regular worst."],
    ['Any advice?', "Train between runs, not during. And never stand in a doorway you didn't check twice."],
  ]),
  chatter('clerk', 'If this is about a form, it needs to be the other form.', [
    ['Which other form?', "The one you don't have. I'd give you one, but that requires a form."],
    ['What are you filing?', 'Incident reports. Every single one ends with "and then it stopped". Nobody ever writes what happened after it stopped.'],
  ]),
  chatter('security', 'Keep moving, operative. Nothing to see. That is the official position on most things.', [
    ['Is it safe here?', "Safe as anywhere with a lock on the door. The lock's on our side. That's the important bit."],
    ['What are you watching for?', "Anything that walks wrong. You'd be surprised how many things walk wrong around here."],
  ]),
  chatter('janitor', "Mind the wet floor. And the dry floor. Honestly, just mind the floor.", [
    ['Rough day?', "Something left a trail of glowing footprints from the lift to the medbay. Mopped it twice. It's back. I've stopped mopping and started taking it personally."],
    ['Need a hand?', 'Bless you, no. Just keep the coolant off your boots and we will get along fine.'],
  ]),
  chatter('cook', "Stew's on. Don't ask what's in it, I only know the first four things.", [
    ['What are the first four things?', 'Water, salt, something from Hydroponics, and optimism. The fifth thing came from a crate with no label.'],
    ['Feeding the whole site?', 'Every shift, every wing that still answers the intercom. The Deep sends their trays back licked clean. I try not to think about why.'],
  ]),
  chatter('technician', "Can't stop, the junction on the boulevard is arguing with the one on the plaza again.", [
    ['Arguing?', 'Current goes one way, comes back the other, warmer. The old hands call it "the facility thinking". I call it a fault and I log it.'],
    ['Need anything fixed?', "Everything. Bring me salvage and I'll pretend we're making progress."],
  ]),
  chatter('freight', 'Sign here. No? Then out of the way, this pallet has somewhere to be, even if it won\'t tell me where.', [
    ["What's in the crates?", "Says SUNDRIES. Sundries rattle. Sundries sometimes knock back. I don't open sundries."],
    ['Where does it all go?', "Round the trunk line, out to the wings, back again when they won't sign for it. Some of these crates have done the loop thirty times."],
  ]),
  chatter('researcher', 'Hold still. No, sorry, carry on. I was recording ambient readings and you are quite loud, readings-wise.', [
    ['What are you studying?', 'The containment field drift. The site breathes. Very slowly. We are about a third of the way into an inhale.'],
    ['Anything I should know?', 'If a room is warmer on the way out than on the way in, write it down and tell someone who is not me.'],
  ]),
  chatter('orderly', "If you're not bleeding, you're in the wrong queue. If you are, you're also in the wrong queue, the right one's over there.", [
    ['Busy shift?', "Two burns, a bite, and a man who swears his shadow came back late. I'm not qualified for the last one."],
    ['Any tips?', 'Carry Medgel. Carry more than you think. Then carry one more.'],
  ]),
  chatter('deckhand', "Watch the edge. The causeway grates hold, but the drop doesn't care either way.", [
    ['How long have you been down here?', 'Long enough that the surface sounds like a story. The lift goes up, apparently. Never tried it.'],
    ["What's below the chasm?", "More chasm, then a noise, then a light that isn't on any of our maps. We don't go further than the noise."],
  ]),
  chatter('saltworker', 'Salt keeps. That is what they taught us. Salt keeps, and so do we.', [
    ['What happened to the works?', 'The seams went quiet and the drifts started walking. We kept the gate. Somebody had to.'],
    ['Is the cathedral safe?', "It's holy. Holy isn't safe. Go with a lamp and a weapon, and say nothing in the nave."],
  ]),
  chatter('porter', "Visiting hours are over. They've been over for forty years, but we keep the chairs ready.", [
    ['Who are the chairs for?', "Patients. They'll come back. The Matron says so, and she has never once been wrong about who's coming back."],
    ['What is this place?', 'Vesper Sanatorium, Meridian annex. For the ones the facility made unwell. Then the facility got unwell.'],
  ]),
];

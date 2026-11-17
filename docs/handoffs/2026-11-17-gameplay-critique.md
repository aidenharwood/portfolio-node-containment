# Brief: gameplay and fun-factor critique loop

Written 2026-11-17, after commit f817def on `main`. Run this the way the graphics polish loop was run (see `2026-11-16-polish-loop-2.md` for the working rules, the preview and the headless capture workflow).

## Read first

`CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `WORLD_DESIGN.md` and `docs/handoffs/2026-11-16-polish-loop-2.md`.

## Loop

1. **Play and inspect the early game as a new player would:**
   - Character creation and the tutorial.
   - The first quests: Rent Day into the Site Meridian storyline, and Noodle Run.
   - Combat, gathering and crafting.
   - Shops, the market and contracts.

   Trace real progression with the server test harness (`createHarness()` in `packages/server/test`) and the content data. Look at XP curves, drop rates, recipe costs, time to the first gear upgrade, dead ends, and moments with no clear next goal. Take headless shots where the experience is visual: the HUD, quest guidance, combat feedback.
2. **Spawn ONE read-only Fable 5.2 critic agent at high effort.** If Fable is rate-limited, fall back to Opus and say so. Give it your findings, shots and the relevant files. Ask for:
   - a verdict line, "ship it" or "not yet";
   - at most 8 prioritised, concrete changes to pacing, rewards, clarity, the feedback loop or fun, each naming files and data.
3. **Apply the list data-first.** Change content in `packages/shared/src/content`, or add a new `Condition`/`GameEffect` variant, rather than writing bespoke engine code. Keep the progression rule (skills plus gear only, gear gated by skill levels) and keep the server authoritative.
4. **Check, then re-review.** Run `npm run typecheck`, `npm test` and `node scripts/_issues.ts`. Send the next round to the same critic with SendMessage, and repeat until it says "ship it".

## Rules

- **Commit and push** to `main` after each coherent batch, with the procedure in the polish handoff:
  1. Commit on `world-rebuild`.
  2. Run `git checkout main && git merge --ff-only world-rebuild && git push origin main && git checkout world-rebuild`.
  3. End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Never commit** `scripts/_*`, `.claude/launch.json` or `docs/superpowers/specs/*.png`.
- **Previews:**
  - Don't touch the owner's dev server on 7420 or 5173.
  - `preview_start` hangs over Remote Control. Start `gamePreview.mjs` from the old scratchpad with Bash in the background instead (client 5176, server 7421).
  - Shoot with `scripts/_shoot.mjs`, or use `scripts/_cycle.sh '<location json>' <shotName>` to move the character, start the preview, shoot and stop it again.
- **Live server:** don't investigate 192.168.1.245; it is parked.

## Done means

- The critic says "ship it".
- Checks are green.
- Everything is pushed.
- A new handoff in `docs/handoffs/` records the findings and what changed.

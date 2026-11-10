# Agent guide

Read `ARCHITECTURE.md` and `CONTRIBUTING.md` before changing code, and `WORLD_DESIGN.md` before touching a district, a level or anything placed in one. The essentials:

- Monorepo with npm workspaces: `packages/shared` (pure rules, content and protocol), `packages/server` (Node 24 running `.ts` directly), `packages/client` (Vite + Three.js voxel renderer).
- Write no code comments. Use erasable TypeScript only (no enums, namespaces or parameter properties). Imports use `.ts` extensions.
- Gameplay content is typed data in `packages/shared/src/content`. Prefer adding data, or a new `Condition`/`GameEffect` variant, over bespoke engine code.
- Characters differ only cosmetically. There are no attributes or origins. Stat-like values derive from trainable skills plus gear (`deriveCombatProfile`), and gear is gated only by skill levels.
- The world is built to `WORLD_DESIGN.md`: maps come from blueprints, placements name a room, districts join at exits at least 9 tiles wide, and `findWorldDesignIssues` enforces it. Never add a district to `LEGACY_DISTRICTS`.
- The server is authoritative. Validate every client intent on the server, even when the client also checks it.
- Before finishing, run `npm run typecheck` and `npm test`. Both must pass. Content cross-references are validated by `findContentIssues`.
- To run the game, use `npm run dev` and open http://localhost:5173. The game server listens on port 7420.

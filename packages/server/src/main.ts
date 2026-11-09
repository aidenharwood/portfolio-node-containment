import { createServer } from 'node:http';
import { findContentIssues, GAME_CONTENT } from '@containment/shared';
import { AccountRepository } from './auth/accountRepository.ts';
import { AuthService } from './auth/authService.ts';
import { LoginThrottle } from './auth/loginThrottle.ts';
import { SessionRepository } from './auth/sessionRepository.ts';
import { CharacterRepository } from './characters/characterRepository.ts';
import { CharacterService } from './characters/characterService.ts';
import { loadServerConfig } from './config.ts';
import { Gameplay } from './gameplay/gameplay.ts';
import { MessageRouter } from './net/messageRouter.ts';
import { createStaticFileHandler } from './net/staticFiles.ts';
import { attachWebSocketGateway } from './net/webSocketGateway.ts';
import { openDatabase } from './persistence/database.ts';
import { MarketRepository } from './persistence/marketRepository.ts';

const contentIssues = findContentIssues(GAME_CONTENT);
if (contentIssues.length > 0) {
  console.error('Game content failed validation:\n' + contentIssues.map((issue) => `  - ${issue}`).join('\n'));
  process.exit(1);
}

const config = loadServerConfig();
const database = openDatabase(config.databasePath);

const sessions = new SessionRepository(database, config.sessionLifetimeMs);
const auth = new AuthService(new AccountRepository(database), sessions, new LoginThrottle());
const characters = new CharacterService(new CharacterRepository(database, GAME_CONTENT), GAME_CONTENT, config.maxCharactersPerAccount);
const gameplay = new Gameplay(GAME_CONTENT, characters, {
  tickMs: config.tickMs,
  autosaveIntervalMs: config.autosaveIntervalMs,
  market: new MarketRepository(database),
});
const router = new MessageRouter(auth, characters, gameplay);

const httpServer = createServer(createStaticFileHandler(config.clientDistPath));
attachWebSocketGateway(httpServer, router);

const tickTimer = setInterval(() => gameplay.tick(), config.tickMs);
sessions.purgeExpired();

httpServer.listen(config.port, () => {
  console.log(`Containment Online server listening on http://localhost:${config.port} (tick ${config.tickMs}ms)`);
});

function shutdown(): void {
  clearInterval(tickTimer);
  gameplay.saveAll();
  database.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

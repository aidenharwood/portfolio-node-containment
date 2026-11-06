import type { Server } from 'node:http';
import { clientMessageSchema } from '@containment/shared';
import { WebSocketServer, type RawData } from 'ws';
import { ClientSession } from './clientSession.ts';
import type { MessageRouter } from './messageRouter.ts';

const MAX_MESSAGE_BYTES = 8 * 1024;

export function attachWebSocketGateway(httpServer: Server, router: MessageRouter): WebSocketServer {
  const server = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });

  server.on('connection', (socket, request) => {
    const session = new ClientSession(socket, request.socket.remoteAddress ?? 'unknown');
    let queue = Promise.resolve();

    socket.on('message', (data: RawData) => {
      if (!session.withinMessageBudget()) return;
      const parsed = clientMessageSchema.safeParse(parseJson(data));
      if (!parsed.success) {
        session.send({ type: 'error', message: 'Malformed message.' });
        return;
      }
      queue = queue
        .then(() => router.dispatch(session, parsed.data))
        .catch((error: unknown) => {
          console.error('Failed to handle message', parsed.data.type, error);
          session.send({ type: 'error', message: 'The server could not process that request.' });
        });
    });

    socket.on('close', () => {
      queue = queue.then(() => router.disconnect(session));
    });
  });

  return server;
}

function parseJson(data: RawData): unknown {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

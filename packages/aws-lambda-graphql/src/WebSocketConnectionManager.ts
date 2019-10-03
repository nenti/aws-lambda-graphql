import * as WebSocket from 'ws';
import { ExtendableError } from './errors';
import { IConnection, IConnectEvent, IConnectionManager } from './types';

export class ConnectionNotFoundError extends ExtendableError {}

interface WSConnectEvent extends IConnectEvent {
  socket: WebSocket;
}

interface WSConnection extends IConnection {
  socket: WebSocket;
}

class WebSocketConnectionManager implements IConnectionManager {
  public connections: Map<string, WSConnection>;

  constructor() {
    this.connections = new Map();
  }

  hydrateConnection = async (
    connectionId: string,
    useLegacyProtocol?: boolean,
  ): Promise<IConnection> => {
    // if connection is not found, throw so we can terminate connection
    const connection = this.connections.get(connectionId);

    if (connection == null) {
      throw new ConnectionNotFoundError(`Connection ${connectionId} not found`);
    }

    if (useLegacyProtocol && !connection.data.useLegacyProtocol) {
      await this.setLegacyProtocol(connection);
      connection.data.useLegacyProtocol = true;
    }

    return connection;
  };

  setLegacyProtocol = async (connection: WSConnection): Promise<void> => {
    this.connections.set(connection.id, {
      socket: connection.socket,
      id: connection.id,
      data: {
        ...connection.data,
        useLegacyProtocol: true,
      },
    });
  };

  registerConnection = async ({
    connectionId,
    endpoint,
    socket,
  }: WSConnectEvent): Promise<WSConnection> => {
    const connection: WSConnection = {
      socket,
      id: connectionId,
      data: { endpoint },
    };

    this.connections.set(connectionId, connection);

    return connection;
  };

  sendToConnection = (
    connection: WSConnection,
    payload: string | Buffer,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        connection.socket.send(payload, err => (err ? reject(err) : resolve()));
      } catch (e) {
        reject(e);
      }
    });
  };

  unregisterConnection = async (connection: IConnection): Promise<void> => {
    this.connections.delete(connection.id);
  };
}

export { WebSocketConnectionManager };
export default WebSocketConnectionManager;

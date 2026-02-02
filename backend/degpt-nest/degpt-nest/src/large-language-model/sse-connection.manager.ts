import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

interface SSEConnection {
  requestId: string;
  response: Response;
  connectedAt: Date;
}

@Injectable()
export class SSEConnectionManager {
  private readonly logger = new Logger(SSEConnectionManager.name);
  private connections: Map<string, SSEConnection[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    // Start heartbeat to keep connections alive
    this.startHeartbeat();
  }

  /**
   * Add a new SSE connection for a request
   */
  addConnection(requestId: string, response: Response): void {
    const connection: SSEConnection = {
      requestId,
      response,
      connectedAt: new Date(),
    };

    const existing = this.connections.get(requestId) || [];
    existing.push(connection);
    this.connections.set(requestId, existing);

    this.logger.log(
      `SSE connection added for requestId: ${requestId}. Total connections: ${existing.length}`,
    );

    // Setup connection cleanup on client disconnect
    response.on('close', () => {
      this.removeConnection(requestId, response);
    });
  }

  /**
   * Remove a specific SSE connection
   */
  private removeConnection(requestId: string, response: Response): void {
    const connections = this.connections.get(requestId);
    if (!connections) return;

    const filtered = connections.filter((conn) => conn.response !== response);

    if (filtered.length === 0) {
      this.connections.delete(requestId);
      this.logger.log(`All SSE connections closed for requestId: ${requestId}`);
    } else {
      this.connections.set(requestId, filtered);
      this.logger.log(
        `SSE connection removed for requestId: ${requestId}. Remaining: ${filtered.length}`,
      );
    }
  }

  /**
   * Send an event to all connections for a specific requestId
   */
  sendEvent(requestId: string, event: string, data: any): void {
    const connections = this.connections.get(requestId);
    if (!connections || connections.length === 0) {
      this.logger.debug(`No active SSE connections for requestId: ${requestId}`);
      return;
    }

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    connections.forEach((conn) => {
      try {
        conn.response.write(message);
        this.logger.debug(
          `SSE event sent to requestId: ${requestId}, event: ${event}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send SSE event to requestId: ${requestId}`,
          error,
        );
        this.removeConnection(requestId, conn.response);
      }
    });
  }

  /**
   * Send a status update event
   */
  sendStatusUpdate(requestId: string, data: any): void {
    this.sendEvent(requestId, 'status', data);
  }

  /**
   * Send a completion event and close connections
   */
  sendCompletion(requestId: string, data: any): void {
    this.sendEvent(requestId, 'completed', data);
    this.closeConnections(requestId);
  }

  /**
   * Send an error event and close connections
   */
  sendError(requestId: string, error: any): void {
    this.sendEvent(requestId, 'error', error);
    this.closeConnections(requestId);
  }

  /**
   * Close all connections for a specific requestId
   */
  private closeConnections(requestId: string): void {
    const connections = this.connections.get(requestId);
    if (!connections) return;

    connections.forEach((conn) => {
      try {
        conn.response.end();
      } catch (error) {
        this.logger.error(
          `Failed to close SSE connection for requestId: ${requestId}`,
          error,
        );
      }
    });

    this.connections.delete(requestId);
    this.logger.log(`All SSE connections closed for requestId: ${requestId}`);
  }

  /**
   * Send heartbeat to all active connections to keep them alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const totalConnections = Array.from(this.connections.values()).reduce(
        (sum, conns) => sum + conns.length,
        0,
      );

      if (totalConnections === 0) return;

      this.logger.debug(`Sending heartbeat to ${totalConnections} connections`);

      this.connections.forEach((connections, requestId) => {
        connections.forEach((conn) => {
          try {
            conn.response.write(': heartbeat\n\n');
          } catch (error) {
            this.logger.error(
              `Failed to send heartbeat to requestId: ${requestId}`,
              error,
            );
            this.removeConnection(requestId, conn.response);
          }
        });
      });
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Get the number of active connections for a requestId
   */
  getConnectionCount(requestId: string): number {
    return this.connections.get(requestId)?.length || 0;
  }

  /**
   * Get total number of active connections
   */
  getTotalConnectionCount(): number {
    return Array.from(this.connections.values()).reduce(
      (sum, conns) => sum + conns.length,
      0,
    );
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.connections.forEach((connections, requestId) => {
      this.closeConnections(requestId);
    });
  }
}

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Response } from 'express';

interface SSEConnection {
  requestId: string;
  response: Response;
  connectedAt: Date;
}

@Injectable()
export class SSEConnectionManager implements OnModuleDestroy {
  private readonly logger = new Logger(SSEConnectionManager.name);
  private connections: Map<string, SSEConnection[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    // 启动心跳保活
    this.startHeartbeat();
  }

  /**
   * 添加新的 SSE 连接
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

    // 监听客户端断开连接
    response.on('close', () => {
      this.removeConnection(requestId, response);
    });
  }

  /**
   * 移除特定连接
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
   * 发送标准 SSE 事件
   */
  sendEvent(requestId: string, event: string, data: any): void {
    const connections = this.connections.get(requestId);
    if (!connections || connections.length === 0) {
      this.logger.debug(
        `No active SSE connections for requestId: ${requestId}`,
      );
      return;
    }

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    connections.forEach((conn) => {
      try {
        conn.response.write(message);

        // 🔥 强制刷新缓冲区 (如果使用了 Compression 中间件，这行很重要)
        if ((conn.response as any).flush) {
          (conn.response as any).flush();
        }

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
   * 发送状态更新
   */
  sendStatusUpdate(requestId: string, data: any): void {
    this.sendEvent(requestId, 'status', data);
  }

  /**
   * 发送完成信号并优雅关闭
   * 🔥 核心修复：增加 2 秒延时，防止发完秒挂导致前端报错
   */
  sendCompletion(requestId: string, data: any): void {
    this.sendEvent(requestId, 'completed', data);

    // 延时关闭，给前端留出接收数据的时间
    setTimeout(() => {
      this.closeConnections(requestId);
      this.logger.log(
        `[Graceful Close] Connections closed for ${requestId} after 2s delay`,
      );
    }, 2000);
  }

  /**
   * 发送错误信号并优雅关闭
   * 🔥 核心修复：增加 2 秒延时
   */
  sendError(requestId: string, error: any): void {
    this.sendEvent(requestId, 'failed', error);

    // 延时关闭，确保错误信息能传达给前端
    setTimeout(() => {
      this.closeConnections(requestId);
      this.logger.log(
        `[Graceful Close] Error connections closed for ${requestId} after 2s delay`,
      );
    }, 2000);
  }

  /**
   * 关闭特定请求的所有连接
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
  }

  /**
   * 发送心跳包保活
   * 🔥 核心修复：
   * 1. 频率改为 5秒 (更频繁地刺激网络)
   * 2. 使用 'event: ping' 可见事件，而不是 ': heartbeat' 注释
   * 3. 强制 flush 穿透 Nginx 缓冲
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const totalConnections = Array.from(this.connections.values()).reduce(
        (sum, conns) => sum + conns.length,
        0,
      );

      if (totalConnections === 0) return;

      // this.logger.debug(`Sending ping to ${totalConnections} connections`);

      this.connections.forEach((connections, requestId) => {
        connections.forEach((conn) => {
          try {
            // ✅ 发送真实数据包，防止被 Nginx/Cloudflare 视为空闲
            const pingMessage = `event: ping\ndata: {"time": "${new Date().toISOString()}"}\n\n`;
            conn.response.write(pingMessage);

            // ✅ 强制刷新，防止 Nginx Gzip 缓冲
            if ((conn.response as any).flush) {
              (conn.response as any).flush();
            }
          } catch (error) {
            this.logger.error(
              `Failed to send heartbeat to requestId: ${requestId}`,
              error,
            );
            this.removeConnection(requestId, conn.response);
          }
        });
      });
    }, 5000); // 5秒一次心跳
  }

  /**
   * 获取活跃连接数
   */
  getConnectionCount(requestId: string): number {
    return this.connections.get(requestId)?.length || 0;
  }

  /**
   * 获取总活跃连接数
   */
  getTotalConnectionCount(): number {
    return Array.from(this.connections.values()).reduce(
      (sum, conns) => sum + conns.length,
      0,
    );
  }

  /**
   * 模块销毁时清理资源
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

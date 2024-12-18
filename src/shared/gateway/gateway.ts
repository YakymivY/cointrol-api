import { SubscribeMessage } from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PortfolioService } from 'src/portfolio/portfolio.service';
import { Cache } from '@nestjs/cache-manager';
import { PortfolioAssetAmount } from 'src/portfolio/interfaces/portfolio-data.interface';
import { WebsocketService } from '../websocket/websocket.service';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({ cors: { origin: '*' } })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('Websocket gateway');

  //storing user ids
  private userConnections = new Map<string, Set<string>>();
  //storing user intervalId to cancel
  private subscribedClients = new Map<string, NodeJS.Timeout>();

  constructor(
    private portfolioService: PortfolioService,
    private wsService: WebsocketService,
    private readonly env: ConfigService,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
  ) {}

  // when a client connects
  handleConnection(client: Socket): void {
    const JWT_SECRET: string = this.env.get<string>('JWT_SECRET');
    const token: string = client.handshake.auth?.token as string;
    //there is no token provided
    if (!token) {
      this.logger.error('Authentication token missing.');
      client.disconnect();
      return;
    }

    try {
      //decode and verify token
      const payload: any = jwt.verify(token, JWT_SECRET);
      const userId: string = payload.userId;

      if (!userId) {
        throw new Error('Invalid token payload');
      }

      //store userId
      client.data.userId = userId;

      //get existing socket ids or create new
      const sockets = this.userConnections.get(userId) || new Set();
      sockets.add(client.id);
      this.userConnections.set(userId, sockets);

      this.logger.log(`Client connected: ${userId}. Socket: ${client.id}`);
    } catch (error) {
      this.logger.error('Authentication error:', error.message);
      client.disconnect();
    }
  }

  //when a clients disconnects
  handleDisconnect(client: Socket): void {
    //get userId from connected users array
    const userId: string = Array.from(this.userConnections.keys()).find((id) =>
      this.userConnections.get(id)?.has(client.id),
    );
    if (userId) {
      //remove socket from list
      const sockets = this.userConnections.get(userId);
      sockets?.delete(client.id);

      //delete user from connected users list
      if (sockets?.size === 0) {
        this.userConnections.delete(userId);
        this.logger.log(`User ${userId} has no active connections.`);
      }

      //unsubscribe properly
      this.unsubscribeFromPortfolioUpdates(userId);
    }
    this.logger.log(`Socket ${client.id} disconnected.`);
  }

  @SubscribeMessage('subscribe-portfolio-data')
  async handlePortfolioSubscription(client: Socket) {
    const userId: string = client.data.userId;

    //check unsubscribed users
    if (!this.userConnections.has(userId)) {
      this.logger.warn(`Client ${userId} is not connected.`);
      return;
    }

    //send portfolio data every 5 seconds
    if (!this.subscribedClients.has(userId)) {
      //just to start from execution not interval
      this.sendPortfolioData(userId);

      const intervalId = setInterval(async () => {
        this.sendPortfolioData(userId);
      }, 5000);

      this.subscribedClients.set(userId, intervalId);
      this.logger.log(`User ${userId} subscribed for portfolio data.`);
    }
  }

  @SubscribeMessage('unsubscribe-portfolio-data')
  async handlePortfolioUnsubscription(
    client: Socket,
    payload: { userId: string },
  ) {
    const { userId } = payload;

    this.unsubscribeFromPortfolioUpdates(userId);
  }

  async unsubscribeFromPortfolioUpdates(userId: string) {
    const intervalId = this.subscribedClients.get(userId);
    if (intervalId) {
      //stop sending portfolio-data
      clearInterval(intervalId);
      this.subscribedClients.delete(userId);

      //get user asssets from cache
      const userAssetsData: PortfolioAssetAmount[] | null =
        await this.cacheManager.get(`portfolio:${userId}`);
      if (!userAssetsData) {
        this.logger.warn('No assets have been removed from tracklist.');
      }
      //take array of assets
      const userAssets: string[] = userAssetsData.map((item) => item.asset);
      this.wsService.removeFromTracklist(userAssets);

      //delete portfolio data from cache
      this.cacheManager.del(`portfolio:${userId}`);
      this.logger.log(`User ${userId} unsubscribed from portfolio data.`);
    }
  }

  async sendPortfolioData(userId: string) {
    const portfolioData = await this.portfolioService.getPortfolio(userId); //fetch portfolio data for the user

    const sockets = this.userConnections.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        socket?.emit('portfolio-data', portfolioData);
      });
    }
  }
}

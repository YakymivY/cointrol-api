import { Cache } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { ExratePayload } from './interfaces/exrate-payload.interface';

@Injectable()
export class WebsocketService implements OnModuleInit, OnModuleDestroy {
  private ws: WebSocket;
  private logger = new Logger(WebsocketService.name);

  constructor(
    private env: ConfigService,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
  ) {}

  onModuleInit() {
    this.connectToWebSocket();
  }

  private connectToWebSocket(): void {
    const externalWebSocketUrl = this.env.get<string>('COINAPI_WS_URL');
    this.ws = new WebSocket(externalWebSocketUrl, {
      headers: {
        'X-CoinAPI-Key': this.env.get<string>('COINAPI_KEY'),
      },
    });

    //handle websocket connection events
    this.ws.on('open', () => {
      this.logger.log('Connected to websocket server.');
    });

    this.ws.on('message', (message: string) => {
      try {
        //parse json
        const data = JSON.parse(message);
        const { type, ...payload } = data;

        //update if the data contains rates
        if (type === 'exrate') {
          this.updateExchangeRates(payload);
        } else {
          this.logger.log(`Non-rate message. Type: ${type}`);
        }

        this.logger.log(
          `Received type: ${type}, payload: ${JSON.stringify(payload)}`,
        );
      } catch (error) {
        this.logger.error('Failed to parse message:', error.message);
      }
    });

    this.ws.on('error', (error) => {
      this.logger.error('WebSocket error: ', error.message);
    });

    this.ws.on('close', (code, reason) => {
      this.logger.log(
        `Websocket connection closed. Code: ${code}, Reason: ${reason}`,
      );
    });
  }

  sendMessage(data: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.logger.error('WebSocket is not open. Message is not sent.');
    }
  }

  updateExchangeRates(payload: ExratePayload) {
    const { asset_id_base, rate } = payload;

    //load rates into cache with time-to-leave of 30sec
    this.cacheManager.set(`exchangeRates:${asset_id_base}`, rate, 30000);
    this.logger.log(`Updated asset: ${asset_id_base} with rate: ${rate}`);
  }

  onModuleDestroy() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

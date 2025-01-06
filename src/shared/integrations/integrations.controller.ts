import { Controller, Get, Post, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CoinlistItem } from './interfaces/coinlist-item.interface';
import { CoinMetrics } from './interfaces/coin-metrics.interface';

@Controller('integrations')
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get('/sync-assets')
  syncAssets() {
    this.integrationsService.syncAssets();
  }

  @Get('/assets-list')
  findAssets(@Query('ticker') query: string): Promise<string[]> {
    return this.integrationsService.findAsset(query);
  }

  @Get('/validate-asset')
  validateAsset(@Query('ticker') query: string): Promise<boolean> {
    return this.integrationsService.isAsset(query);
  }

  @Get('/coingecko-list')
  getCoingeckoAssetList(): Promise<CoinlistItem[]> {
    return this.integrationsService.fetchCoinList();
  }

  @Post('/update-coins')
  async updateCoinList(): Promise<string> {
    await this.integrationsService.updateCoinList();
    return 'Coin list updated successfully';
  }

  @Get('coin-metrics')
  async getCoinMetrics(@Query('ticker') ticker: string): Promise<CoinMetrics> {
    //return first element because it has the greates market cap
    return await this.integrationsService.getMetadataForCoins(ticker);
  }
}

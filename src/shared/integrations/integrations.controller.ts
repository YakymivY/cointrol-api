import { Controller, Get, Post, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CoinlistItem } from './interfaces/coinlist-item.interface';
import { CoinMetrics } from './interfaces/coin-metrics.interface';
import { CoinComplexOutput } from './interfaces/coin-complex-output.interface';

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
    const ids: string[] = await this.integrationsService.getCoinIdsByTicker(
      ticker.toLowerCase(),
    );
    return await this.integrationsService.getMetadataForCoins(ids);
  }

  @Get('tokenlist-item-data')
  async getTokenlistItemData(
    @Query('tickers') tickers: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ): Promise<CoinComplexOutput> {
    let tickerArray: string[];
    if (!tickers) {
      tickerArray = await this.integrationsService.getTopMarketCap();
    } else {
      //split tickers string into an array
      tickerArray = tickers.split(',').map((ticker) => ticker.trim());
    }

    return this.integrationsService.getDataForTokenList(
      tickerArray,
      page,
      limit,
    );
  }
}

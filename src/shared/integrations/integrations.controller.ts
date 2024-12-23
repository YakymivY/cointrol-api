import { Controller, Get, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

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
}

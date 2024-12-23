import { Controller, Get } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get('/sync-assets')
  syncAssets() {
    this.integrationsService.syncAssets();
  }

  @Get('/assets-list')
  getListOfAssets(): Promise<string[]> {
    return this.integrationsService.getAllAssets();
  }
}

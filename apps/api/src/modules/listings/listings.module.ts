import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller.js';
import { ListingsAdminController } from './listings-admin.controller.js';
import { DiscoveryController } from './discovery.controller.js';
import { ListingsService } from './listings.service.js';
import { DiscoveryService } from './discovery.service.js';
import { CatalogService } from './catalog.service.js';

@Module({
  controllers: [ListingsController, ListingsAdminController, DiscoveryController],
  providers: [ListingsService, DiscoveryService, CatalogService],
  exports: [ListingsService],
})
export class ListingsModule {}

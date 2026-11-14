import { Controller, Get, Param, Query } from '@nestjs/common';
import { listingSearchSchema } from '@jom-laut/validation';
import type { ListingSearch } from '@jom-laut/validation';
import { DiscoveryService } from './discovery.service.js';
import { CatalogService } from './catalog.service.js';
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe.js';
import { Public } from '../../platform/security/decorators.js';

/** Public discovery + catalog endpoints (US-6/7/8). */
@Public()
@Controller()
export class DiscoveryController {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly catalog: CatalogService,
  ) {}

  @Get('discovery/listings')
  search(@Query(new ZodValidationPipe(listingSearchSchema)) query: ListingSearch) {
    return this.discovery.search(query);
  }

  @Get('discovery/listings/:id')
  detail(@Param('id') id: string) {
    return this.discovery.getDetail(id);
  }

  @Get('catalog/locations')
  locations(@Query('parentId') parentId?: string) {
    return this.catalog.listLocations(parentId);
  }

  @Get('catalog/locations/:id/jetties')
  jetties(@Param('id') id: string) {
    return this.catalog.listJetties(id);
  }

  @Get('catalog/amenities')
  amenities() {
    return this.catalog.listAmenities();
  }
}

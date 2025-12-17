import { Client, GeocodingAddressComponentType } from '@googlemaps/google-maps-services-js';
import { Body, Controller, Get, NotFoundException } from '@nestjs/common';
import * as turf from '@turf/turf';

import type { DeliveryAddressValidateRequest, DeliveryAddressValidateResponse } from '@wcp/wario-shared';

import { Public } from '../../auth/decorators/public.decorator';
import { DataProviderService } from 'src/config/data-provider/data-provider.service';

const client = new Client({});

@Controller('api/v1/addresses')
@Public()
export class DeliveryAddressController {
  constructor(private readonly dataProvider: DataProviderService) {}

  @Get()
  async validateAddress(@Body() body: DeliveryAddressValidateRequest) {
    const GOOGLE_GEOCODE_KEY = this.dataProvider.getKeyValueConfig().GOOGLE_GEOCODE_KEY;
    const serviceArea = this.dataProvider.getFulfillments()[body.fulfillmentId].serviceArea;
    if (!serviceArea) {
      throw new NotFoundException(`Unable to find delivery area for fulfillment: ${body.fulfillmentId} `);
    }
    const DELIVERY_POLY = turf.polygon(serviceArea.coordinates);
    const r = await client.geocode({
      params: {
        address: `${body.address} ${body.zipcode} ${body.city}, ${body.state} `,
        key: GOOGLE_GEOCODE_KEY,
      },
      timeout: 2000, //ms
    });
    const result = r.data.results[0];
    const address_point = turf.point([result.geometry.location.lng, result.geometry.location.lat]);
    const in_area = turf.booleanPointInPolygon(address_point, DELIVERY_POLY);
    const street_number_component = result.address_components.find(
      (x) => x.types[0] === GeocodingAddressComponentType.street_number,
    );
    return {
      validated_address: result.formatted_address,
      in_area,
      found: street_number_component != undefined && body.address.indexOf(street_number_component.long_name) === 0,
      address_components: result.address_components,
    } as DeliveryAddressValidateResponse;
  }

  @Get('validate')
  async validateAddressAlt(@Body() body: DeliveryAddressValidateRequest) {
    return this.validateAddress(body);
  }
}

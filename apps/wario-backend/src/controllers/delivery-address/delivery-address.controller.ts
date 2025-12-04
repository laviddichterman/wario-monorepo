import { Client, GeocodingAddressComponentType } from '@googlemaps/google-maps-services-js';
import { Body, Controller, Get, Next, Res } from '@nestjs/common';
import * as turf from '@turf/turf';
import type { NextFunction, Response } from 'express';

import type { DeliveryAddressValidateRequest, DeliveryAddressValidateResponse } from '@wcp/wario-shared';

import { DataProviderService } from '../../config/data-provider/data-provider.service';

const client = new Client({});

@Controller('api/v1/addresses')
export class DeliveryAddressController {
  constructor(private readonly dataProvider: DataProviderService) {}

  @Get()
  async validateAddress(
    @Body() body: DeliveryAddressValidateRequest,
    @Res() response: Response,
    @Next() next: NextFunction,
  ) {
    try {
      const GOOGLE_GEOCODE_KEY = this.dataProvider.KeyValueConfig.GOOGLE_GEOCODE_KEY;
      const serviceArea = this.dataProvider.Fulfillments[body.fulfillmentId].serviceArea;
      if (!serviceArea) {
        return response.status(404).send(`Unable to find delivery area for fulfillment: ${body.fulfillmentId}`);
      }
      const DELIVERY_POLY = turf.polygon(serviceArea.coordinates);
      const r = await client.geocode({
        params: {
          address: `${body.address} ${body.zipcode} ${body.city}, ${body.state}`,
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
      return response.status(200).json({
        validated_address: result.formatted_address,
        in_area,
        found: street_number_component != undefined && body.address.indexOf(street_number_component.long_name) === 0,
        address_components: result.address_components,
      } as DeliveryAddressValidateResponse);
    } catch (error) {
      next(error);
      return;
    }
  }

  @Get('validate')
  async validateAddressAlt(
    @Body() body: DeliveryAddressValidateRequest,
    @Res() response: Response,
    @Next() next: NextFunction,
  ) {
    return this.validateAddress(body, response, next);
  }
}

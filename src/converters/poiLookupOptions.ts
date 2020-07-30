/*
 * Copyright (c) 2020 Erik Fortune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import * as Converters from '@fgv/ts-utils/converters';
import * as GeoConverters from '../converters/geoConverters';
import * as PoiLookupOptions from '../places/poiLookupOptions';

export const poiLookupOptionsPropertiesFieldConverters: Converters.FieldConverters<PoiLookupOptions.Properties> = {
    allowedZones: Converters.arrayOf(Converters.string),
    allowedCities: Converters.arrayOf(Converters.string),
    onNonAllowedZones: Converters.enumeratedValue<'error'|'ignore'>(['error', 'ignore']),
    onNonAllowedCities: Converters.enumeratedValue<'error'|'ignore'>(['error', 'ignore']),
    preferredCities: Converters.arrayOf(Converters.string),
    preferredZones: Converters.arrayOf(Converters.string),
    requiredCities: Converters.arrayOf(Converters.string),
    requiredZones: Converters.arrayOf(Converters.string),
    near: GeoConverters.coordinateLatLong,
    radius: Converters.number,
    region: GeoConverters.regionFromObjectLatLong,
    noTextSearch: Converters.boolean,
    noExactLookup: Converters.boolean,
};
export const allPoiLookupOptionsPropertiesFields: (keyof PoiLookupOptions.Properties)[] = [
    'allowedZones', 'allowedCities',
    'onNonAllowedZones', 'onNonAllowedCities',
    'preferredCities', 'preferredZones',
    'requiredCities', 'requiredZones',
    'near', 'radius', 'region',
    'noTextSearch', 'noExactLookup',
];

export const poiLookupOptionsProperties = Converters.object<Partial<PoiLookupOptions.Properties>>(
    poiLookupOptionsPropertiesFieldConverters
);

export const partialPoiLookupOptionsProperties = Converters.object<Partial<PoiLookupOptions.Properties>>(
    poiLookupOptionsPropertiesFieldConverters,
    allPoiLookupOptionsPropertiesFields,
);

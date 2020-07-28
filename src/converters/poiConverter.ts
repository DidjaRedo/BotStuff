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
import * as GeoConverters from './geoConverters';

import { Converter, fail } from '@fgv/ts-utils';
import { Poi, PoiProperties } from '../places/poi';

const delimitedString = Converters.delimitedString('|');

export const poiPropertiesFieldConverters = {
    alternateNames: Converters.oneOf([delimitedString, Converters.arrayOf(Converters.string)]),
    city: Converters.string,
    coord: GeoConverters.coordinate,
    name: Converters.string,
    zones: Converters.oneOf([delimitedString, Converters.arrayOf(Converters.string)]),
};

export const poiPropertiesFromObject = Converters.object<PoiProperties>(poiPropertiesFieldConverters);

export const poiPropertiesFromArray = new Converter<PoiProperties>((from: unknown) => {
    if ((!Array.isArray(from)) || (from.length !== 5)) {
        return fail('POI Array must have five columns: zones,city,names,latitude,longitude');
    }

    return Converters.delimitedString('|').convert(from[2]).onSuccess((names) => {
        return poiPropertiesFromObject.convert({
            zones: from[0],
            city: from[1],
            name: names.shift(),
            alternateNames: names,
            coord: {
                latitude: from[3],
                longitude: from[4],
            },
        });
    });
});

export const poiFromObject = poiPropertiesFromObject.map(Poi.createPoi);
export const poiFromArray = poiPropertiesFromArray.map(Poi.createPoi);
export const poi = Converters.oneOf([poiFromObject, poiFromArray]);

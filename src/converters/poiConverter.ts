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

import * as Converters from '../utils/converters';
import * as GeoConverters from './geoConverters';
import { Converter } from '../utils/converter';
import { PoiProperties } from '../places/poi';
import { fail } from '../utils/result';

const delimitedString = Converters.delimitedString('|');

export const poiPropertiesFieldConverters = {
    alternateNames: delimitedString,
    city: Converters.string,
    coord: GeoConverters.coordinate,
    name: Converters.string,
    zones: delimitedString,
};

export const poiPropertiesFromObject = Converters.object<PoiProperties>(poiPropertiesFieldConverters);

export const poiPropertiesFromArray = new Converter<PoiProperties>((from: unknown) => {
    if ((!Array.isArray(from)) || (from.length !== 6)) {
        return fail('POI Array must have six columns: zones,city,names,longitude,latitude');
    }

    return poiPropertiesFromObject.convert({
        zones: from[0],
        city: from[1],
        name: from[2],
        alternateNames: from[3],
        coord: {
            latitude: from[4],
            longitude: from[5],
        },
    });
});

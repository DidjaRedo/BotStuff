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
import * as Geo from '../utils/geo';
import { Result, fail } from '../utils/result';
import { Converter } from '../utils/converter';

export const latitude = Converters.number.withConstraint(Geo.validateLatitude);
export const longitude = Converters.number.withConstraint(Geo.validateLongitude);

export const coordinateFromObject = Converters.object({
    latitude: latitude,
    longitude: longitude,
});

export const coordinateFromString = new Converter<Geo.Coordinate>((from: unknown): Result<Geo.Coordinate> => {
    if (typeof from === 'string') {
        const parts = from.split(',');
        if (parts.length !== 2) {
            return fail(`Malformed location coordinate ${from}`);
        }

        return coordinateFromObject.convert({
            latitude: parts[0].trim(),
            longitude: parts[1].trim(),
        });
    }
    return fail('Cannot convert a non-string to location');
});

export const coordinate = Converters.oneOf([
    coordinateFromObject,
    coordinateFromString,
]);

export const regionFromObject = Converters.object({
    nw: coordinate,
    se: coordinate,
});

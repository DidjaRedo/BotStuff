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
import * as Geo from '../utils/geo';
import { Converter, Result, fail } from '@fgv/ts-utils';

export const latitude = Converters.number.withConstraint(Geo.validateLatitude);
export const longitude = Converters.number.withConstraint(Geo.validateLongitude);

export const coordinateFromObject = Converters.object({
    latitude: latitude,
    longitude: longitude,
});

export const coordinateFromArrayLatLong = new Converter<Geo.Coordinate>((from: unknown): Result<Geo.Coordinate> => {
    if ((!Array.isArray(from)) || (from.length !== 2)
        || ((typeof from[0] !== 'string') && (typeof from[0] !== 'number'))
        || ((typeof from[1] !== 'string') && (typeof from[1] !== 'number'))) {
        return fail(`Malformed lat/long coordinate ${JSON.stringify(from)}`);
    }
    return coordinateFromObject.convert({
        latitude: from[0],
        longitude: from[1],
    });
});

export const coordinateFromArrayLongLat = new Converter<Geo.Coordinate>((from: unknown): Result<Geo.Coordinate> => {
    if ((!Array.isArray(from)) || (from.length !== 2)
        || ((typeof from[0] !== 'string') && (typeof from[0] !== 'number'))
        || ((typeof from[1] !== 'string') && (typeof from[1] !== 'number'))) {
        return fail(`Malformed lat/long coordinate ${JSON.stringify(from)}`);
    }
    return coordinateFromObject.convert({
        longitude: from[0],
        latitude: from[1],
    });
});

export const coordinateFromStringLatLong = new Converter<Geo.Coordinate>((from: unknown): Result<Geo.Coordinate> => {
    if (typeof from === 'string') {
        return coordinateFromArrayLatLong.convert(from.split(',').map((c) => c.trim()));
    }
    return fail('Cannot convert a non-string to lat/long coordinate');
});

export const coordinateFromStringLongLat = new Converter<Geo.Coordinate>((from: unknown): Result<Geo.Coordinate> => {
    if (typeof from === 'string') {
        return coordinateFromArrayLongLat.convert(from.split(',').map((c) => c.trim()));
    }
    return fail('Cannot convert a non-string to long/lat coordinate');
});

export const coordinateLatLong = Converters.oneOf([
    coordinateFromObject,
    coordinateFromArrayLatLong,
    coordinateFromStringLatLong,
]);

export const coordinateLongLat = Converters.oneOf([
    coordinateFromObject,
    coordinateFromArrayLongLat,
    coordinateFromStringLongLat,
]);

export const regionFromObjectLatLong = Converters.object({
    nw: coordinateLatLong,
    se: coordinateLatLong,
});

export const regionFromObjectLongLat = Converters.object({
    nw: coordinateLongLat,
    se: coordinateLongLat,
});

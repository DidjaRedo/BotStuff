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
import { Result, fail, succeed } from './result';

export interface Coordinate {
    latitude: number;
    longitude: number;
}

export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

export function isValidLongitude(longitude: number): boolean {
    return Number.isFinite(longitude) && (longitude >= MIN_LONGITUDE) && (longitude <= MAX_LONGITUDE);
}

export function isValidLatitude(latitude: number): boolean {
    return Number.isFinite(latitude) && (latitude >= MIN_LATITUDE) && (latitude <= MAX_LATITUDE);
}

export function validateLatitude(lat: number): Result<number> {
    if (Number.isFinite(lat) && (lat >= MIN_LATITUDE) && (lat <= MAX_LATITUDE)) {
        return succeed(lat);
    }
    return fail(`Invalid latitude ${lat} must be ${MIN_LATITUDE}..${MAX_LATITUDE}`);
}

export function validateLongitude(long: number): Result<number> {
    if (Number.isFinite(long) && (long >= MIN_LONGITUDE) && (long <= MAX_LONGITUDE)) {
        return succeed(long);
    }
    return fail(`Invalid longitude ${long} must be ${MIN_LONGITUDE}..${MAX_LONGITUDE}`);
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

export function getDistanceInMeters(c1: Coordinate, c2: Coordinate): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(c2.latitude - c1.latitude);
    const dLon = deg2rad(c2.longitude - c1.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(deg2rad(c1.latitude)) * Math.cos(deg2rad(c2.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c * 1000; // Distance in meters
    return d;
}

export function coordinatesAreNear(c1: Coordinate, c2: Coordinate, distanceInMeters: number): boolean {
    return getDistanceInMeters(c1, c2) <= distanceInMeters;
}

export function coordinateIsInRegion(c: Coordinate, r?: Region): boolean {
    if (r === undefined) {
        return true;
    }

    return (c.latitude >= r.min.latitude) && (c.longitude >= r.min.longitude)
        && (c.latitude <= r.max.latitude) && (c.longitude <= r.max.longitude);
}

export interface Region {
    max: Coordinate;
    min: Coordinate;
}

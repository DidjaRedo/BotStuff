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

import * as PoiLookupOptions from '../places/poiLookupOptions';

import { BaseConverter, Converter, fail, mapResults, succeed } from '@fgv/ts-utils';

import { City } from '../places/city';
import { GlobalPoiDirectoryBase } from '../places/globalPoiDirectory';
import { Poi } from '../places/poi';
import { Zone } from '../places/zone';
import { isArray } from 'util';

export function cityFromString<T extends Poi, TO extends PoiLookupOptions.Properties>(dir: GlobalPoiDirectoryBase<T, TO>): Converter<City> {
    return new BaseConverter<City>((from: unknown) => {
        if (typeof from !== 'string') {
            return fail(`Cannot convert non-string ${JSON.stringify(from)} to city`);
        }
        return dir.cities.getStrict(from);
    });
}

export function cities<T extends Poi, TO extends PoiLookupOptions.Properties>(dir: GlobalPoiDirectoryBase<T, TO>): Converter<City[]> {
    return new BaseConverter<City[]>((from: unknown) => {
        let cityNames: string[]|undefined = undefined;
        if (typeof from === 'string') {
            cityNames = from.split(',').map((n) => n.trim());
        }
        else if (isArray(from)) {
            for (const name of from) {
                if (typeof name !== 'string') {
                    return fail(`Cannot convert non-string ${JSON.stringify(name)} to city`);
                }
            }
            cityNames = from;
        }
        else {
            return fail(`Cannot convert ${JSON.stringify(from)} to list of cities`);
        }
        return mapResults(cityNames.map((n) => dir.cities.getStrict(n)));
    });
}

export function zoneFromString<T extends Poi, TO extends PoiLookupOptions.Properties>(dir: GlobalPoiDirectoryBase<T, TO>): Converter<Zone> {
    return new BaseConverter<Zone>((from: unknown) => {
        if (typeof from !== 'string') {
            return fail(`Cannot convert non-string ${JSON.stringify(from)} to zone`);
        }
        return dir.zones.getStrict(from);
    });
}

export function zones<T extends Poi, TO extends PoiLookupOptions.Properties>(dir: GlobalPoiDirectoryBase<T, TO>): Converter<Zone[]> {
    return new BaseConverter<Zone[]>((from: unknown) => {
        let zoneNames: string[]|undefined = undefined;
        if (typeof from === 'string') {
            zoneNames = from.split(',').map((n) => n.trim());
        }
        else if (isArray(from)) {
            for (const name of from) {
                if (typeof name !== 'string') {
                    return fail(`Cannot convert non-string ${JSON.stringify(name)} to zone`);
                }
            }
            zoneNames = from;
        }
        else {
            return fail(`Cannot convert ${JSON.stringify(from)} to list of zones`);
        }
        return mapResults(zoneNames.map((n) => dir.zones.getStrict(n)));
    });
}

export type Places = { cities: City[], zones: Zone[] };

export function places<T extends Poi, TO extends PoiLookupOptions.Properties>(dir: GlobalPoiDirectoryBase<T, TO>): Converter<Places> {
    return new BaseConverter<Places>((from: unknown) => {
        let names: string[]|undefined = undefined;
        if (typeof from === 'string') {
            names = from.split(',').map((n) => n.trim());
        }
        else if (isArray(from)) {
            for (const name of from) {
                if (typeof name !== 'string') {
                    return fail(`Cannot convert non-string ${JSON.stringify(name)} to place`);
                }
            }
            names = from;
        }
        else {
            return fail(`Cannot convert ${JSON.stringify(from)} to list of places`);
        }
        const result: Places = {
            cities: [],
            zones: [],
        };

        const errors: string[] = [];
        for (const name of names) {
            const cityResult = dir.cities.getStrict(name);
            if (cityResult.isSuccess()) {
                result.cities.push(cityResult.value);
            }
            else {
                const zoneResult = dir.zones.getStrict(name);
                if (zoneResult.isSuccess()) {
                    result.zones.push(zoneResult.value);
                }
                else {
                    errors.push(`'${name}' is not a city or zone.`);
                }
            }
        }

        if (errors.length > 0) {
            return fail(errors.join('\n'));
        }
        return succeed(result);
    });
}

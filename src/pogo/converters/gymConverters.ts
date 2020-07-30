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

import {
    Converter,
    Result,
    fail,
    succeed,
} from '@fgv/ts-utils';
import { GlobalGymDirectory, GymLookupOptionsProperties } from '../gymDirectory';
import { Gym, GymProperties } from '../gym';
import { Names } from '../../names/names';
import { allPoiLookupOptionsPropertiesFields } from '../../converters';
import { poiLookupOptionsPropertiesFieldConverters } from '../../converters';
import { poiPropertiesFieldConverters } from '../../converters/poiConverter';
import { readCsvFileSync } from '@fgv/ts-utils/csvHelpers';
import { readJsonFileSync } from '@fgv/ts-utils/jsonHelpers';

export const exStatus = new Converter((from: unknown): Result<boolean> => {
    if (typeof from === 'string') {
        switch (Names.normalize(from).getValueOrDefault()) {
            case 'nonex':
                return succeed(false);
            case 'ex':
            case 'exeligible':
                return succeed(true);
            default:
                return fail(`Invalid EX status ${from} (nonEx/ex/exEligible)`);
        }
    }
    return fail(`Invalid EX status ${JSON.stringify(from)} must be string`);
});

export function bestGymByName(gyms: GlobalGymDirectory, options?: Partial<GymLookupOptionsProperties>): Converter<Gym> {
    return new Converter<Gym>((from: unknown) => {
        if (typeof from !== 'string') {
            return fail('Gym name must be a string');
        }
        return gyms.lookup(from, options).firstItem();
    });
}

export function singleGymByName(gyms: GlobalGymDirectory, options?: Partial<GymLookupOptionsProperties>): Converter<Gym> {
    return new Converter<Gym>((from: unknown) => {
        if (typeof from !== 'string') {
            return fail('Gym name must be a string');
        }
        return gyms.lookup(from, options).singleItem();
    });
}

export function gymsByName(gyms: GlobalGymDirectory, options?: Partial<GymLookupOptionsProperties>): Converter<Gym[]> {
    return new Converter<Gym[]>((from: unknown) => {
        if (typeof from !== 'string') {
            return fail('Gym name must be a string');
        }
        return succeed(gyms.lookup(from, options).allItems());
    });
}

export const gymPropertiesFieldConverters = {
    ...poiPropertiesFieldConverters,
    isExEligible: exStatus,
};

export const gymPropertiesFromObject = Converters.object<GymProperties>(gymPropertiesFieldConverters);

export const gymPropertiesFromArray = new Converter<GymProperties>((from: unknown): Result<GymProperties> => {
    if ((!Array.isArray(from)) || (from.length !== 6)) {
        return fail('Gym array must have six columns: zones, city, names, latitude, longitude, isExEligible');
    }
    return Converters.delimitedString('|').convert(from[0]).onSuccess((zones: string[]) => {
        return Converters.delimitedString('|').convert(from[2]).onSuccess((names: string[]) => {
            return gymPropertiesFromObject.convert({
                zones: zones,
                city: from[1],
                name: names.shift(),
                alternateNames: names,
                coord: {
                    latitude: from[3],
                    longitude: from[4],
                },
                isExEligible: from[5],
            });
        });
    });
});

export const gymPropertiesFromLegacyArray = new Converter<GymProperties>((from: unknown): Result<GymProperties> => {
    if ((!Array.isArray(from)) || (from.length !== 8)) {
        return fail('Gym array must have eight columns: uid, zones, city, official name, friendly name, longitude, latitude, exStatus');
    }

    // The legacy CSV format has "official name" and "friendly name"
    // where friendly name is a '|' separated list of names, the first
    // of which is the actual friendly name and the rest of which are
    // aliases.
    // The friendly name is the only name guaranteed to be unique, so
    // it should be used as the primary key, which means we need to
    // combine and then resplit the official and friendly names to
    // determine our "name" and "alternateNames"
    const officialNameResult = Converters.string.convert(from[3]);
    if (officialNameResult.isFailure()) {
        return fail(officialNameResult.message);
    }
    const officialName = officialNameResult.value;

    const friendlyNamesResult = Converters.delimitedString('|').convert(from[4]);
    if (friendlyNamesResult.isFailure()) {
        return fail(friendlyNamesResult.message);
    }
    const [primaryName, ...aliases] = friendlyNamesResult.value;

    const alternateNames = (primaryName === officialName)
        ? aliases
        : [officialName, ...aliases];

    return gymPropertiesFromObject.convert({
        zones: from[1],
        city: from[2],
        name: primaryName,
        alternateNames: alternateNames,
        coord: {
            latitude: from[6],
            longitude: from[5],
        },
        isExEligible: from[7],
    });
});

export const gymProperties = Converters.oneOf([
    gymPropertiesFromObject,
    gymPropertiesFromArray,
]);

export const gym = gymProperties.map(Gym.createGym);

export const legacyGym = gymPropertiesFromLegacyArray.map(Gym.createGym);
export const legacyGymCsv = Converters.arrayOf(legacyGym);

export function loadLegacyGymsFile(path: string): Result<Gym[]> {
    return readCsvFileSync(path).onSuccess((body) => {
        return legacyGymCsv.convert(body);
    });
}

export function globalGymDirectory(options?: Partial<GymLookupOptionsProperties>): Converter<GlobalGymDirectory> {
    return Converters.arrayOf(gym).map((gyms) => GlobalGymDirectory.createGymDirectory(options, gyms));
}

export function loadGlobalGymDirectorySync(path: string, options?: Partial<GymLookupOptionsProperties>): Result<GlobalGymDirectory> {
    return readJsonFileSync(path).onSuccess((json) => {
        return globalGymDirectory(options).convert(json);
    });
}

export const partialGymLookupOptionsProperties = Converters.object<Partial<GymLookupOptionsProperties>>({
    ...poiLookupOptionsPropertiesFieldConverters,
    exFilter: Converters.enumeratedValue<'nonEx'|'exEligible'>(['nonEx', 'exEligible']),
}, [...allPoiLookupOptionsPropertiesFields, 'exFilter']);

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
import { Poi, PoiProperties } from '../places/poi';
import { Result, fail, succeed } from '../utils/result';
import { Converter } from '../utils/converter';
import { Names } from '../names/names';
import { poiPropertiesFieldConverters } from '../converters/poiConverter';

export interface GymProperties extends PoiProperties {
    isExEligible: boolean;
}

export class Gym extends Poi implements GymProperties {
    public readonly isExEligible: boolean;

    public constructor(init: GymProperties) {
        super(init);
        this.isExEligible = init.isExEligible;
    }
}

export const exStatusConverter = new Converter((from: unknown): Result<boolean> => {
    if (typeof from === 'string') {
        switch (Names.normalize(from).getValueOrDefault()) {
            case 'nonex':
                return succeed(false);
            case 'exeligible':
                return succeed(true);
            default:
                return fail(`Invalid EX status ${from} (nonEx/exEligible)`);
        }
    }
    return fail(`Invalid EX status ${JSON.stringify(from)} must be string`);
});

export const gymPropertiesFieldConverters = {
    ...poiPropertiesFieldConverters,
    isExEligible: exStatusConverter,
};

export const gymPropertiesFromObject = Converters.object<GymProperties>(gymPropertiesFieldConverters);

export const gymPropertiesFromArray = new Converter<GymProperties>((from: unknown): Result<GymProperties> => {
    if ((!Array.isArray(from)) || (from.length !== 7)) {
        return fail('Gym array must have seven columns: zones, city, name, alternate names, latitude, longitude, isExEligible');
    }
    return gymPropertiesFromObject.convert({
        zones: from[0],
        city: from[1],
        name: from[2],
        alternateNames: from[3],
        coord: {
            latitude: from[4],
            longitude: from[5],
        },
        isExEligible: from[6],
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

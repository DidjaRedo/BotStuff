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

import { BaseConverter, RangeOf, fail } from '@fgv/ts-utils';
import { RaidTier, validatePokemonType, validateRaidTier, validateWeather } from '../game';

export const pokemonType = new BaseConverter(validatePokemonType);
export const pokemonTypeArray = Converters.arrayOf(pokemonType);

export const pokemonTypes = Converters.oneOf([
    pokemonTypeArray,
    Converters.delimitedString('|').mapConvert(pokemonTypeArray),
]);

export const raidTier = new BaseConverter(validateRaidTier);
export const weather = new BaseConverter(validateWeather);

export const raidTierRange = new BaseConverter<RangeOf<RaidTier>>((from: unknown) => {
    if (typeof from !== 'string') {
        return fail(`Cannot convert ${JSON.stringify(from)} to raid tier range`);
    }
    const normalized = from.trim().toLowerCase();

    // e.g. T3+ or T3- means 3-max
    if (normalized.endsWith('+') || normalized.endsWith('-')) {
        const result = validateRaidTier(normalized.slice(0, -1)).onSuccess((min) => {
            return RangeOf.createRange<RaidTier>({ min, max: 6 });
        });

        if (result.isSuccess()) {
            return result;
        }
    }
    else if (normalized.startsWith('-')) {
        const result = validateRaidTier(normalized.slice(1)).onSuccess((max) => {
            return RangeOf.createRange<RaidTier>({ min: 1, max });
        });

        if (result.isSuccess()) {
            return result;
        }
    }

    const parts = normalized.split('-');
    if (parts.length === 1) {
        const result = validateRaidTier(normalized).onSuccess((exact) => {
            return RangeOf.createRange<RaidTier>({ min: exact, max: exact });
        });

        if (result.isSuccess()) {
            return result;
        }
    }

    if (parts.length === 2) {
        const result = validateRaidTier(parts[0]).onSuccess((min) => {
            return validateRaidTier(parts[1]).onSuccess((max) => {
                return RangeOf.createRange<RaidTier>({ min, max });
            });
        });
        if (result.isSuccess()) {
            return result;
        }
    }

    return fail(`Cannot convert ${from} to raid tier range`);
});

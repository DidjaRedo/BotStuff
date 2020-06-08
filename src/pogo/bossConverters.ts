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
import * as PogoConverters from './pogoConverters';
import * as TimeConverters from '../time/timeConverters';
import { fail, succeed } from '../utils/result';
import { BossProperties } from './boss';
import { Converter } from '../utils/converter';
import { DateRange } from '../time/dateRange';

export const bossPropertiesFieldConverters: Converters.FieldConverters<BossProperties> = {
    name: Converters.string,
    alternateNames: Converters.arrayOf(Converters.string),
    displayName: Converters.optionalString,
    tier: PogoConverters.raidTier,
    pokedexNumber: Converters.number,
    raidGuideName: Converters.string,
    imageFileName: Converters.string,
    numRaiders: Converters.number,
    cpRange: Converters.rangeOf(Converters.number),
    boostedCpRange: Converters.rangeOf(Converters.number),
    types: PogoConverters.pokemonTypes,
    active: Converters.oneOf<boolean|DateRange>([Converters.boolean, TimeConverters.dateRange]),
};

export const bossPropertiesOptionalFields: (keyof BossProperties)[] = [
    'displayName', 'alternateNames', 'pokedexNumber', 'raidGuideName',
    'imageFileName', 'numRaiders', 'cpRange', 'boostedCpRange',
    'types', 'active',
];

export const bossPropertiesFromObject = Converters.object<BossProperties>(
    bossPropertiesFieldConverters,
    bossPropertiesOptionalFields,
);

export const bossPropertiesFromLegacyArray = new Converter<BossProperties>((from: unknown) => {
    if ((!Array.isArray(from)) || (from.length !== 5)) {
        return fail('Legacy boss array must have five columns: name, index, tier, image, status');
    }
    return bossPropertiesFromObject.convert({
        name: from[0],
        pokedexNumber: from[1],
        tier: ((typeof from[2] === 'string') ? from[2].replace('Tier ', '') : from[2]),
        active: (from[4] === 'active'),
    });
});

export interface BossNames {
    name: string;
    displayName?: string;
    alternateNames?: string[];
}

export const bossNames = new Converter<BossNames>((from: unknown) => {
    if (typeof from !== 'string') {
        return fail(`Invalid names specifier ${JSON.stringify(from)} must be string.`);
    }

    const alternateNames = from.split('|');
    const name = alternateNames.shift();

    let displayName: string|undefined;
    for (let i = 0; i < alternateNames.length; i++) {
        let alt = alternateNames[i];
        if (alt.startsWith('*')) {
            alt = alt.substring(1);
            if (displayName !== undefined) {
                return fail(`Display name multiply defined ("${displayName}" and "${alt}"`);
            }
            alternateNames[i] = alt;
            displayName = alt;
        }
    }
    return succeed({ name, displayName, alternateNames });
});

export const bossPropertiesFromArray = new Converter<BossProperties>((from: unknown) => {
    if ((!Array.isArray(from)) || (from.length < 8) || (from.length > 9)) {
        return fail('Boss array must have 8-9 columns: tier, names, index, numRaiders, cpMin, cpMax, bcpMin, bcpMax, [types]');
    }

    const namesResult = bossNames.convert(from[1]);
    if (namesResult.isFailure()) {
        return fail(`Error converting boss names: ${namesResult.message}`);
    }

    return bossPropertiesFromObject.convert({
        tier: from[0],
        ...namesResult.value,
        pokedexNumber: from[2],
        numRaiders: from[3],
        cpRange: { min: from[4], max: from[5] },
        boostedCpRange: { min: from[6], max: from[7] },
        types: ((from.length === 9) ? from[8] : undefined),
    });
});

export const noTierBossPropertiesFromObject = bossPropertiesFromObject.addPartial(['tier']);

export const noTierBossPropertiesFromArray = new Converter<Partial<BossProperties>>((from: unknown) => {
    if ((!Array.isArray(from)) || (from.length < 7) || (from.length > 8)) {
        return fail('Boss array must have seven or eight columns: names, index, numRaiders, cpMin, cpMax, bcpMin, bcpMax, [types]');
    }

    const namesResult = bossNames.convert(from[0]);
    if (namesResult.isFailure()) {
        return fail(namesResult.message);
    }

    return noTierBossPropertiesFromObject.convert({
        ...namesResult.value,
        pokedexNumber: from[1],
        numRaiders: from[2],
        cpRange: { min: from[3], max: from[4] },
        boostedCpRange: { min: from[5], max: from[6] },
        types: ((from.length === 8) ? from[8] : undefined),
    });
});

export const bossProperties = Converters.oneOf([
    bossPropertiesFromObject,
    bossPropertiesFromArray,
    bossPropertiesFromLegacyArray,
]);

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
import * as PogoConverters from './pogoConverters';

import { BaseConverter, Converter, Result, fail } from '@fgv/ts-utils';
import { Raid, RaidJson, validateRaidType } from '../raid';

import { BossDirectory } from '../bossDirectory';
import { GlobalGymDirectory } from '../gymDirectory';
import { RaidMap } from '../raidMap';
import { readJsonFileSync } from '@fgv/ts-json/file';

export const raidType = new BaseConverter(validateRaidType);

export function raidFromObject(gyms: GlobalGymDirectory, bosses: BossDirectory): Converter<Raid> {
    return Converters.object<RaidJson>({
        boss: Converters.string,
        gym: Converters.string,
        hatch: Converters.string,
        tier: PogoConverters.raidTier,
        type: raidType,
    }, ['boss', 'tier']).map((json) => {
        return Raid.createFromJson(json, gyms, bosses);
    });
}

export function raidFromArray(gyms: GlobalGymDirectory, bosses: BossDirectory): Converter<Raid> {
    return new BaseConverter((from: unknown) => {
        if (Array.isArray(from) && (from.length === 4)) {
            return raidFromObject(gyms, bosses).convert({
                hatch: from[0],
                gym: from[1],
                boss: (typeof from[2] === 'string') ? from[2] : undefined,
                tier: (typeof from[2] === 'number') ? from[2] : undefined,
                type: from[3],
            });
        }
        return fail(`Invalid raid properties array ${JSON.stringify(from)}`);
    });
}

export function raid(gyms: GlobalGymDirectory, bosses: BossDirectory): Converter<Raid> {
    return Converters.oneOf([raidFromArray(gyms, bosses), raidFromObject(gyms, bosses)]);
}

export function raidMap(gyms: GlobalGymDirectory, bosses: BossDirectory): Converter<RaidMap> {
    return Converters.arrayOf(raid(gyms, bosses)).map(RaidMap.create);
}

export function loadRaidMapSync(path: string, gyms: GlobalGymDirectory, bosses: BossDirectory): Result<RaidMap> {
    return readJsonFileSync(path).onSuccess((json) => {
        return raidMap(gyms, bosses).convert(json);
    });
}

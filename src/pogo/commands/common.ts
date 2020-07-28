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

import {
    Boss,
    CategorizedRaids,
    Raid,
    RaidLookupOptions,
    RaidManager,
} from '..';
import { CommandBase, CommandProperties } from '../../commands';
import {
    FormatTargets,
    Formatter,
    RangeOf,
    Result,
    succeed,
} from '@fgv/ts-utils';
import {
    bossesFormatters,
    categorizedRaidsFormatters,
    raidFormatters,
} from '../formatters';

import { RaidTier } from '../game';

const tierNoCapture = '(?:(?:L|T|l|t)?\\d)';

const baseFormats: Record<string, string> = {
    alphaName: '[a-zA-Z]+',
    alphaNames: '[a-zA-Z]+(?:\\s|[a-zA-Z])*',
    name: '\\w+',
    names: '\\w+(?:\\s|\\w|`|\'|-|\\.)*',
    time: '(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?',
    timer: '\\d?\\d',
    tier: '(?:(?:L|T|l|t)?(\\d+))',
    minTier: `(?:${tierNoCapture}\\s*(?:[+-]))`,
    maxTier: `(?:-)(?:${tierNoCapture})`,
    tierMinMax: `(?:${tierNoCapture}\\s*-\\s*${tierNoCapture})`,
};

export const commonFormats: Record<string, string> = {
    ...baseFormats,
    csv: `(?:${baseFormats.names})(?:,\\s*${baseFormats.names})*`,
    alphaCsv: `(?:${baseFormats.alphaNames})(?:,\\s*${baseFormats.alphaNames})*`,
    tierRange: `(?:${tierNoCapture}|${baseFormats.minTier}|${baseFormats.maxTier}|${baseFormats.tierMinMax})`,
};

export interface CommonProperties {
    boss: string;
    bosses: string[];
    place: string;
    places: string[];
    time: Date;
    timer: number;
    tier: number;
    tierRange: RangeOf<RaidTier>,
    maxTier: number;
}

export const commonProperties: CommandProperties<CommonProperties> = {
    boss: { value: commonFormats.alphaNames },
    bosses: { value: commonFormats.alphaCsv },
    place: { value: commonFormats.names },
    places: { value: commonFormats.csv },
    time: { value: commonFormats.time },
    timer: { value: commonFormats.timer },
    tier: { value: commonFormats.tier, hasEmbeddedCapture: true },
    tierRange: { value: commonFormats.tierRange },
    maxTier: { value: commonFormats.maxTier, hasEmbeddedCapture: true },
};

export interface PogoCommandHandler {
    execute(rm: RaidManager, options?: Partial<RaidLookupOptions>): Result<string>;
}

export class BossesCommand<TNAME, TRAW, TPROPS> extends CommandBase<TNAME, TRAW, TPROPS, Boss[]> {
    public getDefaultFormatter(target: FormatTargets): Result<Formatter<Boss[]>> {
        return succeed(bossesFormatters[target]);
    }
}

export class CategorizedRaidsCommand<TNAME, TRAW, TPROPS> extends CommandBase<TNAME, TRAW, TPROPS, CategorizedRaids> {
    public getDefaultFormatter(target: FormatTargets): Result<Formatter<CategorizedRaids>> {
        return succeed(categorizedRaidsFormatters[target]);
    }
}

export class RaidCommand<TNAME, TRAW, TPROPS> extends CommandBase<TNAME, TRAW, TPROPS, Raid> {
    public getDefaultFormatter(target: FormatTargets): Result<Formatter<Raid>> {
        return succeed(raidFormatters[target]);
    }
}


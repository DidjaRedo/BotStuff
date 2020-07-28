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
import * as PlaceConverters from '../../converters/placeConverters';
import * as PogoConverters from '../../pogo/converters/pogoConverters';

import { CategorizedRaids, Raid } from '../raid';
import { CategorizedRaidsCommand, commonFormats, commonProperties } from './common';
import { CommandInitializer, Commands } from '../../commands/command';
import { RangeOf, Result, succeed } from '@fgv/ts-utils';

import { CommandProcessor } from '../../commands/commandProcessor';
import { ParserBuilder } from '../../commands/commandParser';
import { RaidLookupOptions } from '../raidMap';
import { RaidManager } from '../raidManager';
import { RaidTier } from '../game';

interface Fields {
    tier?: RaidTier;
    maxTier?: RaidTier;
    tierRange?: RangeOf<RaidTier>;
    places?: PlaceConverters.Places;
}

const builder = new ParserBuilder<Fields>({
    tier: commonProperties.tier,
    maxTier: commonProperties.maxTier,
    tierRange: commonProperties.tierRange,
    places: { value: `in (${commonFormats.alphaCsv})`, hasEmbeddedCapture: true },
});

export interface RaidsCommands {
    allRaids: CategorizedRaids;
    exRaids: CategorizedRaids;
    byTier: CategorizedRaids;
    defaultRaids: CategorizedRaids;
}

export type RaidsCommandType = keyof RaidsCommands;

function listRaids(rm: RaidManager, command: RaidsCommandType, params: Fields, options?: Partial<RaidLookupOptions>): Result<CategorizedRaids> {
    const effective: Partial<RaidLookupOptions> = { ...options };

    switch (command) {
        case 'allRaids':
            effective.minTier = 1;
            effective.maxTier = 5;
            break;
        case 'exRaids':
            effective.exFilter = 'exEligible';
            break;
        case 'byTier':
            // istanbul ignore else
            if (params.tierRange !== undefined) {
                effective.minTier = params.tierRange.min;
                effective.maxTier = params.tierRange.max;
            }
            break;
        case 'defaultRaids':
            effective.minTier = 4;
            effective.maxTier = 5;
            break;
    }

    if (params.places !== undefined) {
        // istanbul ignore else
        if (params.places.cities) {
            effective.requiredCities = params.places.cities.map((c) => c.primaryKey);
        }

        // istanbul ignore else
        if (params.places.zones) {
            effective.requiredZones = params.places.zones.map((z) => z.primaryKey);
        }
    }

    return rm.getAllRaids(effective).onSuccess((raids) => {
        return succeed(Raid.categorizeRaids(raids));
    });
}

export type AllRaidsFields = Partial<Pick<Fields, 'places'>>;
export type AllRaidsCommandInitializer = CommandInitializer<RaidsCommandType, Fields, AllRaidsFields, CategorizedRaids>;
export function allRaidsCommandInitializer(rm: RaidManager, options?: Partial<RaidLookupOptions>): AllRaidsCommandInitializer {
    return {
        name: 'allRaids',
        description: 'List all raids',
        examples: [
            '  !raids all [in <cities or zones>]',
            '  !raids all',
            '  !raids all in rose hill',
            '  !raids all in rain city',
        ],
        parser: builder.build('!raids all {{places?}}').getValueOrThrow(),
        converter: Converters.object({
            places: PlaceConverters.places(rm.gyms),
        }, ['places']),
        executor: (params: AllRaidsFields) => {
            return listRaids(rm, 'allRaids', params, options);
        },
        formatter: (_raids: CategorizedRaids): string => {
            return '{{#description}}all{{/description}}';
        },
    };
}

export type ExRaidsFields = Partial<Pick<Fields, 'places'>>;
export type ExRaidsCommandInitializer = CommandInitializer<RaidsCommandType, Fields, ExRaidsFields, CategorizedRaids>;
export function exRaidsCommandInitializer(rm: RaidManager, options?: Partial<RaidLookupOptions>): ExRaidsCommandInitializer {
    return {
        name: 'exRaids',
        description: 'List raids at EX-eligible gyms',
        examples: [
            '  !raids ex [in <cities or zones>]',
            '  !raids ex in redmond',
        ],
        parser: builder.build('!raids ex {{places?}}').getValueOrThrow(),
        converter: Converters.object({
            places: PlaceConverters.places(rm.gyms),
        }, ['places']),
        executor: (params: ExRaidsFields) => {
            return listRaids(rm, 'exRaids', params, options);
        },
        formatter: (_raids: CategorizedRaids): string => {
            return '{{#description}}EX{{/description}}';
        },
    };
}

export type ByTierFields = Partial<Pick<Fields, 'places'|'tierRange'>>;
export type ByTierCommandInitializer = CommandInitializer<RaidsCommandType, Fields, ByTierFields, CategorizedRaids>;
export function byTierCommandInitializer(rm: RaidManager, options?: Partial<RaidLookupOptions>): ByTierCommandInitializer {
    return {
        name: 'byTier',
        description: 'List by tier',
        examples: [
            '  !raids <minTier>+ [in <cities or zones>], or',
            '  !raids <tier> [in <cities or zones>], or',
            '  !raids <minTier>-<maxTier> [in <cities or zones>]',
            '  !raids 3+ in bellevue',
            '  !raids T4',
            '  !raids T4-5 in rain city',
        ],
        parser: builder.build('!raids {{tierRange}} {{places?}}').getValueOrThrow(),
        converter: Converters.object({
            tierRange: PogoConverters.raidTierRange,
            places: PlaceConverters.places(rm.gyms),
        }, ['places']),
        executor: (params: ByTierFields) => {
            return listRaids(rm, 'byTier', params, options);
        },
        formatter: (_raids: CategorizedRaids, params: ByTierFields): string => {
            return `{{#description}}T${params.tierRange}+{{/description}}`;
        },
    };
}

export type DefaultRaidsFields = Partial<Pick<Fields, 'places'>>;
export type DefaultRaidsCommandInitializer = CommandInitializer<RaidsCommandType, Fields, DefaultRaidsFields, CategorizedRaids>;
export function defaultRaidsCommandInitializer(rm: RaidManager, options?: Partial<RaidLookupOptions>): DefaultRaidsCommandInitializer {
    return {
        name: 'defaultRaids',
        description: 'List default raids',
        examples: [
            '  !raids [in <cities or zones>]',
            '  !raids in rose hill',
            '  !raids in DowntownSeattle',
        ],
        parser: builder.build('!raids {{places?}}').getValueOrThrow(),
        converter: Converters.object({
            places: PlaceConverters.places(rm.gyms),
        }, ['places']),
        executor: (params: DefaultRaidsFields) => {
            return listRaids(rm, 'defaultRaids', params, options);
        },
        formatter: (_raids: CategorizedRaids): string => {
            return '{{description}}';
        },
    };
}

export function getRaidsCommands(rm: RaidManager): Commands<RaidsCommands> {
    return {
        allRaids: new CategorizedRaidsCommand(allRaidsCommandInitializer(rm)),
        exRaids: new CategorizedRaidsCommand(exRaidsCommandInitializer(rm)),
        byTier: new CategorizedRaidsCommand(byTierCommandInitializer(rm)),
        defaultRaids: new CategorizedRaidsCommand(defaultRaidsCommandInitializer(rm)),
    };
}

export function getRaidsCommandProcessor(rm: RaidManager): CommandProcessor<RaidsCommands> {
    return new CommandProcessor(
        getRaidsCommands(rm),
        ['allRaids', 'exRaids', 'byTier', 'defaultRaids'],
    );
}

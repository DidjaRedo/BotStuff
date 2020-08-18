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
import * as PogoConverters from '../converters/pogoConverters';

import { CategorizedRaids, Raid } from '../raid';
import {
    CommandProcessor,
    CommandsByName,
    GenericCommand,
} from '../../commands';
import { Converter, FormatTargets, Formatter, RangeOf, Result, fail, succeed } from '@fgv/ts-utils';
import { PogoContext, commonFormats, commonProperties } from './common';

import { ParserBuilder } from '../../commands/commandParser';
import { RaidLookupOptions } from '../raidMap';
import { RaidManager } from '../raidManager';
import { RaidTier } from '../game';
import { categorizedRaidsFormatters } from '../formatters';

interface Params {
    tier?: RaidTier;
    maxTier?: RaidTier;
    tierRange?: RangeOf<RaidTier>;
    places?: PlaceConverters.Places;
}

const builder = new ParserBuilder<Params>({
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

export type RaidsCommandNames = keyof RaidsCommands;

function listRaids(rm: RaidManager, command: RaidsCommandNames, params: Params, options?: Partial<RaidLookupOptions>): Result<CategorizedRaids> {
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

export type BaseRaidsParams = Partial<Pick<Params, 'places'>>;

class RaidsCommandBase<TP> extends GenericCommand<RaidsCommandNames, Params, PogoContext, TP, CategorizedRaids> {
    protected static _getBaseParamsConverter(context: PogoContext): Converter<BaseRaidsParams> {
        return Converters.object<BaseRaidsParams>({
            places: PlaceConverters.places(context.rm.gyms),
        }, ['places']);
    }

    protected static _getDefaultFormatter(target: FormatTargets): Result<Formatter<CategorizedRaids>> {
        const formatter = categorizedRaidsFormatters[target];
        // istanbul ignore next
        return formatter ? succeed(formatter) : fail(`No categorized raids formatter for ${target}`);
    }

    protected _execute<TP>(params: TP, context: PogoContext): Result<CategorizedRaids> {
        return listRaids(context.rm, this.name, params, context.options);
    }
}


export class AllRaidsCommand extends RaidsCommandBase<BaseRaidsParams> {
    public constructor() {
        super({
            name: 'allRaids',
            repeatable: true,
            description: ['List all raids'],
            examples: [
                '  !raids all [in <cities or zones>]',
                '  !raids all',
                '  !raids all in rose hill',
                '  !raids all in rain city',
            ],
            parser: builder.build('!raids all {{places?}}').getValueOrThrow(),
            getConverter: RaidsCommandBase._getBaseParamsConverter,
            execute: (p, c) => this._execute(p, c),
            format: '{{#description}}all{{/description}}',
            getDefaultFormatter: RaidsCommandBase._getDefaultFormatter,
        });
    }
}

export class ExRaidsCommand extends RaidsCommandBase<BaseRaidsParams> {
    public constructor() {
        super({
            name: 'exRaids',
            repeatable: true,
            description: ['List raids at EX-eligible gyms'],
            examples: [
                '  !raids ex [in <cities or zones>]',
                '  !raids ex in redmond',
            ],
            parser: builder.build('!raids ex {{places?}}').getValueOrThrow(),
            getConverter: RaidsCommandBase._getBaseParamsConverter,
            execute: (p, c) => this._execute(p, c),
            format: '{{#description}}EX{{/description}}',
            getDefaultFormatter: RaidsCommandBase._getDefaultFormatter,
        });
    }
}

export type RaidsByTierFields = Partial<Pick<Params, 'places'|'tierRange'>>;
export class RaidsByTierCommand extends RaidsCommandBase<RaidsByTierFields> {
    public constructor() {
        super({
            name: 'byTier',
            repeatable: true,
            description: ['List raids by tier'],
            examples: [
                '  !raids <minTier>+ [in <cities or zones>], or',
                '  !raids <tier> [in <cities or zones>], or',
                '  !raids <minTier>-<maxTier> [in <cities or zones>]',
                '  !raids 3+ in bellevue',
                '  !raids T4',
                '  !raids T4-5 in rain city',
            ],
            parser: builder.build('!raids {{tierRange}} {{places?}}').getValueOrThrow(),
            getConverter: RaidsByTierCommand._getConverter,
            execute: (p, c) => this._execute(p, c),
            format: RaidsByTierCommand._getFormat,
            getDefaultFormatter: RaidsCommandBase._getDefaultFormatter,
        });
    }

    protected static _getConverter(context: PogoContext): Converter<RaidsByTierFields> {
        return Converters.object<RaidsByTierFields>({
            tierRange: PogoConverters.raidTierRange,
            places: PlaceConverters.places(context.rm.gyms),
        }, ['places']);
    }

    protected static _getFormat(params: RaidsByTierFields, _context: PogoContext, _raids: CategorizedRaids): Result<string> {
        return succeed(`{{#description}}${params.tierRange}{{/description}}`);
    }
}

export class DefaultRaidsCommand extends RaidsCommandBase<BaseRaidsParams> {
    public constructor() {
        super({
            name: 'defaultRaids',
            repeatable: true,
            description: ['List default raids'],
            examples: [
                '  !raids [in <cities or zones>]',
                '  !raids in rose hill',
                '  !raids in DowntownSeattle',
            ],
            parser: builder.build('!raids {{places?}}').getValueOrThrow(),
            getConverter: RaidsCommandBase._getBaseParamsConverter,
            execute: (p, c) => this._execute(p, c),
            format: '{{description}}',
            getDefaultFormatter: RaidsCommandBase._getDefaultFormatter,
        });
    }
}

export function getRaidsCommands(): CommandsByName<RaidsCommands, PogoContext> {
    return {
        allRaids: new AllRaidsCommand(),
        exRaids: new ExRaidsCommand(),
        byTier: new RaidsByTierCommand(),
        defaultRaids: new DefaultRaidsCommand(),
    };
}

export function getRaidsCommandProcessor(): CommandProcessor<RaidsCommands, PogoContext> {
    return new CommandProcessor(
        getRaidsCommands(),
        ['allRaids', 'exRaids', 'byTier', 'defaultRaids'],
    );
}

/*
 * Copyright (c) 2020 Erik Fortune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, anPrinciiiiiiiiid/or sell
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
import * as PogoConverters from '../converters/pogoConverters';

import { CommandProcessor, CommandsByName, GenericCommand, ParserBuilder } from '../../commands';
import { ExtendedArray, FormatTargets, Formatter, Result, fail, succeed } from '@fgv/ts-utils';

import { Boss } from '..';
import { PogoContext } from './common';
import { RaidTier } from '../game';
import { bossesByName } from '../converters/bossConverters';
import { bossesFormatters } from '../formatters';
import { commonProperties } from '../commands/common';

export type BossStatusFilter = 'active'|'inactive'|'all';
export const bossStatusConverter = Converters.enumeratedValue<BossStatusFilter>(['active', 'inactive', 'all']);

interface Params {
    boss: ExtendedArray<Boss>;
    gym: string;
    places: string[];
    status: BossStatusFilter;
    tier: RaidTier;
}

const builder = new ParserBuilder({
    boss: commonProperties.bosses,
    gym: commonProperties.place,
    places: commonProperties.places,
    status: { value: '(?:active|inactive|all)' },
    tier: commonProperties.tier,
});

export interface InfoCommands {
    boss: Boss[];
    // bosses: Boss[];
    // gym: Gym;
    // gyms: Gym[];
    // city: City;
    // cities: City[];
    // zone: Zone;
    // zones: Zone[]
}

type InfoCommandNames = keyof InfoCommands;

class InfoCommandBase<TP, TR> extends GenericCommand<InfoCommandNames, Params, PogoContext, TP, TR> {
    protected static _getDefaultBossesFormatter(target: FormatTargets): Result<Formatter<Boss[]>> {
        const formatter = bossesFormatters[target];
        // istanbul ignore next
        return formatter ? succeed(formatter) : fail(`No boss formatter for ${target}`);
    }
}

export type BossInfoParams = Required<Pick<Params, 'boss'>>&Partial<Pick<Params, 'tier'>>;
export class BossInfoCommand extends InfoCommandBase<BossInfoParams, Boss[]> {
    public constructor() {
        super({
            name: 'boss',
            repeatable: true,
            description: ['Get detailed information about bosses'],
            examples: [
                '  !info boss [<tier>] <boss name>',
                '  !info boss zapdos',
                '  !info boss t4 zapdos',
            ],
            parser: builder.build('!info boss {{tier?}} {{boss}}').getValueOrThrow(),
            getConverter: (context: PogoContext) => Converters.object({
                boss: bossesByName(context.rm.bosses),
                tier: PogoConverters.raidTier,
            }, ['tier']),
            execute: (params: BossInfoParams): Result<Boss[]> => {
                let got = params.boss;
                if (params.tier !== undefined) {
                    got = new ExtendedArray('boss', ...params.boss.filter((b) => b.tier === params.tier));
                }
                return got.atLeastOne();
            },
            format: '{{details}}',
            getDefaultFormatter: InfoCommandBase._getDefaultBossesFormatter,
        });
    }
}

export function getInfoCommands(): CommandsByName<InfoCommands, PogoContext> {
    return {
        boss: new BossInfoCommand(),
    };
}

export function getInfoCommandProcessor(): CommandProcessor<InfoCommands, PogoContext> {
    return new CommandProcessor(
        getInfoCommands(),
        ['boss'],
    );
}

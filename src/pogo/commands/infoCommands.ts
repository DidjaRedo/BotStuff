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

import { Boss, BossDirectory, RaidManager } from '..';
import { BossesCommand, commonProperties } from './common';
import { CommandInitializer, CommandProcessor, Commands, ParserBuilder } from '../../commands';
import { ExtendedArray, Result } from '@fgv/ts-utils';

import { RaidTier } from '../game';
import { bossesByName } from '../converters/bossConverters';

export type BossStatusFilter = 'active'|'inactive'|'all';
export const bossStatusConverter = Converters.enumeratedValue<BossStatusFilter>(['active', 'inactive', 'all']);

interface Fields {
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

type InfoCommandType = keyof InfoCommands;

export type BossInfoFields = Required<Pick<Fields, 'boss'>>&Partial<Pick<Fields, 'tier'>>;
export type BossInfoInitializer = CommandInitializer<InfoCommandType, Fields, BossInfoFields, Boss[]>;
export function bossInfoInitializer(bosses: BossDirectory): BossInfoInitializer {
    return {
        name: 'boss',
        description: 'Get detailed information about bosses',
        examples: [
            '  !info boss [<tier>] <boss name>',
            '  !info boss zapdos',
            '  !info boss t4 zapdos',
        ],
        parser: builder.build('!info boss {{tier?}} {{boss}}').getValueOrThrow(),
        converter: Converters.object({
            boss: bossesByName(bosses),
            tier: PogoConverters.raidTier,
        }, ['tier']),
        executor: (params: BossInfoFields): Result<Boss[]> => {
            let got = params.boss;
            if (params.tier !== undefined) {
                got = new ExtendedArray('boss', ...params.boss.filter((b) => b.tier === params.tier));
            }
            return got.atLeastOne();
        },
        formatter: (_bosses: Boss[]): string => {
            return '{{details}}';
        },
    };
}

export function getInfoCommands(rm: RaidManager): Commands<InfoCommands> {
    return {
        boss: new BossesCommand(bossInfoInitializer(rm.bosses)),
    };
}

export function getInfoCommandProcessor(rm: RaidManager): CommandProcessor<InfoCommands> {
    return new CommandProcessor(
        getInfoCommands(rm),
        ['boss'],
    );
}

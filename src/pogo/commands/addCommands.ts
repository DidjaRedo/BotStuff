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
import * as TimeConverters from '../../time/timeConverters';

import { Boss, Gym, Raid, RaidManager } from '..';
import { CommandGroup, CommandProcessor, ParserBuilder } from '../../commands';
import { CommandInitializer, Commands } from '../../commands/command';
import { RaidCommand, commonProperties } from './common';

import { RaidTier } from '../game';
import { Result } from '@fgv/ts-utils';
import { singleBossByName } from '../converters/bossConverters';
import { singleGymByName } from '../converters/gymConverters';

interface Fields {
    gym: Gym;
    boss?: Boss;
    startTime?: Date;
    timer?: number;
    tier?: RaidTier;
}

const builder = new ParserBuilder<Fields>({
    gym: commonProperties.place,
    boss: commonProperties.boss,
    startTime: commonProperties.time,
    timer: commonProperties.timer,
    tier: commonProperties.tier,
});

export const DEFAULT_RAID_TIER = 5;

export interface AddCommands {
    upcomingWithStartTime: Raid;
    upcomingWithTimer: Raid;
    activeWithTimeLeft: Raid;
    updateBoss: Raid;
}

type AddCommandType = keyof AddCommands;

const commonHelp: string[] = [
    'Where:',
    '  Time is 12- or 24-hour format with optional colon.  If am/pm is',
    '  omitted for 12-hour, the next upcoming time is assumed',
    '    12:10pm - 10 minutes after noon',
    '    0615 - 6:15 AM',
    '    9:15 - whichever of 9:15 AM or 9:15 PM comes next',
    '  Tier is 1-5',
    '  Unhatched egg timer is 1-60',
    '  Active raid timer is 1-45',
];

export type UpcomingWithStartTimeFields = Required<Pick<Fields, 'gym'|'startTime'>>&Partial<Pick<Fields, 'tier'>>;
export type UpcomingWithStartTimeInitializer = CommandInitializer<AddCommandType, Fields, UpcomingWithStartTimeFields, Raid>;
export function upcomingWithStartTimeInitializer(rm: RaidManager): UpcomingWithStartTimeInitializer {
    return {
        name: 'upcomingWithStartTime',
        description: 'Add an unhatched egg with start time and optional tier',
        examples: [
            '  !add [<tier>] <gym name> (at|@) <time>',
            '  !add wells fargo at 1012',
            '  !add 4 painted parking lot at 1012am',
            '  !add t3 elephants @ 1732',
            ...commonHelp,
        ],
        parser: builder.build('!add {{tier?}} {{gym}} (?:@|at) {{startTime}}').getValueOrThrow(),
        converter: Converters.object({
            gym: singleGymByName(rm.gyms),
            startTime: TimeConverters.flexTime,
            tier: PogoConverters.raidTier,
        }, ['tier']),
        executor: (params: UpcomingWithStartTimeFields): Result<Raid> => {
            return rm.addFutureRaid(params.startTime, params.gym, params.tier ?? DEFAULT_RAID_TIER);
        },
        formatter: (_raid: Raid): string => {
            return 'Added {{tier}} raid at {{gymName}}';
        },
    };
}

export type UpcomingWithTimerFields = Required<Pick<Fields, 'gym'|'timer'>>&Partial<Pick<Fields, 'tier'>>;
export type UpcomingWithTimerInitializer = CommandInitializer<AddCommandType, Fields, UpcomingWithTimerFields, Raid>;
export function upcomingWithTimerInitializer(rm: RaidManager): UpcomingWithTimerInitializer {
    return {
        name: 'upcomingWithTimer',
        description: 'Add an unhatched egg with time-to-hatch and an optional tier',
        examples: [
            '  !add [<tier>] <gym name> in <time in minutes>',
            '  !add wells fargo in 15',
            '  !add 4 painted parking lot in 30',
            '  !add t3 elephants in 11',
            ...commonHelp,
        ],
        parser: builder.build('!add {{tier?}} {{gym}} in {{timer}}').getValueOrThrow(),
        converter: Converters.object({
            gym: singleGymByName(rm.gyms),
            timer: Converters.number,
            tier: PogoConverters.raidTier,
        }, ['tier']),
        executor: (params: UpcomingWithTimerFields): Result<Raid> => {
            return rm.addFutureRaid(params.timer, params.gym, params.tier ?? DEFAULT_RAID_TIER);
        },
        formatter: (_raid: Raid): string => {
            return 'Added {{tier}} raid at {{gymName}}';
        },
    };
}

export type ActiveWithTimeLeftFields = Required<Pick<Fields, 'gym'|'boss'|'timer'>>;
export type ActiveWithTimeLeftInitializer = CommandInitializer<AddCommandType, Fields, ActiveWithTimeLeftFields, Raid>;
export function activeWithTimeLeftInitializer(rm: RaidManager): ActiveWithTimeLeftInitializer {
    return {
        name: 'activeWithTimeLeft',
        description: 'Add or update an active raid:',
        examples: [
            '  !add <boss> (at|@) <gym name> <time in minutes> left',
            '  !add lugia at wells 30 left',
            '  !add ho-oh at city hall 10 left',
            ...commonHelp,
        ],
        parser: builder.build('!add {{boss}} at {{gym}} {{timer}} left').getValueOrThrow(),
        converter: Converters.object({
            boss: singleBossByName(rm.bosses),
            gym: singleGymByName(rm.gyms),
            timer: Converters.number,
        }),
        executor: (params: ActiveWithTimeLeftFields): Result<Raid> => {
            return rm.addActiveRaid(params.timer, params.gym, params.boss);
        },
        formatter: (_raid: Raid): string => {
            return 'Added {{bossName}} at {{gymName}}';
        },
    };
}

export type UpdateBossFields = Required<Pick<Fields, 'gym'|'boss'>>;
export type UpdateBossInitializer = CommandInitializer<AddCommandType, Fields, UpdateBossFields, Raid>;
export function updateBossInitializer(rm: RaidManager): UpdateBossInitializer {
    return {
        name: 'updateBoss',
        description: 'Add a boss to an active raid',
        examples: [
            '  !add <boss> (at|@) <gym name>',
            '  !add tyranitar at wells',
            ...commonHelp,
        ],
        parser: builder.build('!add {{boss}} at {{gym}}').getValueOrThrow(),
        converter: Converters.object({
            boss: singleBossByName(rm.bosses),
            gym: singleGymByName(rm.gyms),
        }),
        executor: (params: UpdateBossFields): Result<Raid> => {
            return rm.updateRaid(params.gym, params.boss);
        },
        formatter: (_raid: Raid): string => {
            return 'Updated boss for {{gymName}} to be {{bossName}}';
        },
    };
}

class AddCommand<TF> extends RaidCommand<AddCommandType, Fields, TF> {}

export function getAddCommands(rm: RaidManager): Commands<AddCommands> {
    return {
        activeWithTimeLeft: new AddCommand(activeWithTimeLeftInitializer(rm)),
        updateBoss: new AddCommand(updateBossInitializer(rm)),
        upcomingWithStartTime: new AddCommand(upcomingWithStartTimeInitializer(rm)),
        upcomingWithTimer: new AddCommand(upcomingWithTimerInitializer(rm)),
    };
}

export function getAddCommandProcessor(rm: RaidManager): CommandProcessor<AddCommands> {
    return new CommandProcessor(
        getAddCommands(rm),
        ['upcomingWithStartTime', 'upcomingWithTimer', 'activeWithTimeLeft', 'updateBoss'],
    );
}

export function getAddCommandGroup(rm: RaidManager): CommandGroup<AddCommandType, Raid> {
    return new CommandGroup([
        new RaidCommand(upcomingWithStartTimeInitializer(rm)),
        new RaidCommand(upcomingWithTimerInitializer(rm)),
        new RaidCommand(activeWithTimeLeftInitializer(rm)),
        new RaidCommand(updateBossInitializer(rm)),
    ], '!add');
}

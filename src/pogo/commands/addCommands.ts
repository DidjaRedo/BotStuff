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

import { Boss, Gym, Raid } from '..';
import { CommandProcessor, CommandsByName, GenericCommand } from '../../commands';
import { FormatTargets, Formatter, Result, fail, succeed } from '@fgv/ts-utils';
import { PogoContext, commonProperties } from './common';

import { ParserBuilder } from '../../commands';
import { RaidTier } from '../game';
import { raidFormatters } from '../formatters';
import { singleBossByName } from '../converters/bossConverters';
import { singleGymByName } from '../converters/gymConverters';

interface Params {
    gym: Gym;
    boss?: Boss;
    startTime?: Date;
    timer?: number;
    tier?: RaidTier;
}

const builder = new ParserBuilder<Params>({
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

type AddCommandNames = keyof AddCommands;

class AddCommandBase<TP> extends GenericCommand<AddCommandNames, Params, PogoContext, TP, Raid> {
    protected static readonly _helpFooter: string[] = [
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

    protected static _getDefaultFormatter(target: FormatTargets): Result<Formatter<Raid>> {
        const formatter = raidFormatters[target];
        // istanbul ignore next
        return formatter ? succeed(formatter) : fail(`No raid formatter for ${target}`);
    }
}

export type UpcomingWithStartTimeParams = Required<Pick<Params, 'gym'|'startTime'>>&Partial<Pick<Params, 'tier'>>;
export class AddUpcomingWithStartTimeCommand extends AddCommandBase<UpcomingWithStartTimeParams> {
    public constructor() {
        super({
            name: 'upcomingWithStartTime',
            repeatable: false,
            description: ['Add an unhatched egg with start time and optional tier'],
            examples: [
                '  !add [<tier>] <gym name> (at|@) <time>',
                '  !add wells fargo at 1012',
                '  !add 4 painted parking lot at 1012am',
                '  !add t3 elephants @ 1732',
            ],
            footer: AddCommandBase._helpFooter,
            parser: builder.build('!add {{tier?}} {{gym}} (?:@|at) {{startTime}}').getValueOrThrow(),
            getConverter: (context: PogoContext) => Converters.object({
                gym: singleGymByName(context.rm.gyms, context.options),
                startTime: TimeConverters.flexTime,
                tier: PogoConverters.raidTier,
            }, ['tier']),
            execute: (params: UpcomingWithStartTimeParams, context: PogoContext): Result<Raid> => {
                return context.rm.addFutureRaid(params.startTime, params.gym, params.tier ?? DEFAULT_RAID_TIER);
            },
            format: 'Added {{tier}} raid at {{gymName}}',
            getDefaultFormatter: AddCommandBase._getDefaultFormatter,
        });
    }
}

export type UpcomingWithTimerParams = Required<Pick<Params, 'gym'|'timer'>>&Partial<Pick<Params, 'tier'>>;
export class AddUpcomingWithTimerCommand extends AddCommandBase<UpcomingWithTimerParams> {
    public constructor() {
        super({
            name: 'upcomingWithTimer',
            repeatable: false,
            description: ['Add an unhatched egg with time-to-hatch and an optional tier'],
            examples: [
                '  !add [<tier>] <gym name> in <time in minutes>',
                '  !add wells fargo in 15',
                '  !add 4 painted parking lot in 30',
                '  !add t3 elephants in 11',
            ],
            footer: AddCommandBase._helpFooter,
            parser: builder.build('!add {{tier?}} {{gym}} in {{timer}}').getValueOrThrow(),
            getConverter: (context: PogoContext) => Converters.object({
                gym: singleGymByName(context.rm.gyms, context.options),
                timer: Converters.number,
                tier: PogoConverters.raidTier,
            }, ['tier']),
            execute: (params: UpcomingWithTimerParams, context: PogoContext): Result<Raid> => {
                return context.rm.addFutureRaid(params.timer, params.gym, params.tier ?? DEFAULT_RAID_TIER);
            },
            format: 'Added {{tier}} raid at {{gymName}}',
            getDefaultFormatter: AddCommandBase._getDefaultFormatter,
        });
    }
}

export type ActiveWithTimeLeftParams = Required<Pick<Params, 'gym'|'boss'|'timer'>>;
export class AddActiveWithTimeLeftCommand extends AddCommandBase<ActiveWithTimeLeftParams> {
    public constructor() {
        super({
            name: 'activeWithTimeLeft',
            repeatable: false,
            description: ['Add or update an active raid:'],
            examples: [
                '  !add <boss> (at|@) <gym name> <time in minutes> left',
                '  !add lugia at wells 30 left',
                '  !add ho-oh at city hall 10 left',
            ],
            footer: AddCommandBase._helpFooter,
            parser: builder.build('!add {{boss}} at {{gym}} {{timer}} left').getValueOrThrow(),
            getConverter: (context: PogoContext) => Converters.object({
                boss: singleBossByName(context.rm.bosses),
                gym: singleGymByName(context.rm.gyms, context.options),
                timer: Converters.number,
            }),
            execute: (params: ActiveWithTimeLeftParams, context: PogoContext): Result<Raid> => {
                return context.rm.addActiveRaid(params.timer, params.gym, params.boss);
            },
            format: 'Added {{bossName}} at {{gymName}}',
            getDefaultFormatter: AddCommandBase._getDefaultFormatter,
        });
    }
}

export type UpdateBossParams = Required<Pick<Params, 'gym'|'boss'>>;
export class UpdateRaidBossCommand extends AddCommandBase<UpdateBossParams> {
    public constructor() {
        super({
            name: 'updateBoss',
            repeatable: false,
            description: ['Add a boss to an active raid'],
            examples: [
                '  !add <boss> (at|@) <gym name>',
                '  !add tyranitar at wells',
            ],
            footer: AddCommandBase._helpFooter,
            parser: builder.build('!add {{boss}} at {{gym}}').getValueOrThrow(),
            getConverter: (context: PogoContext) => Converters.object({
                boss: singleBossByName(context.rm.bosses),
                gym: singleGymByName(context.rm.gyms, context.options),
            }),
            execute: (params: UpdateBossParams, context: PogoContext): Result<Raid> => {
                return context.rm.updateRaid(params.gym, params.boss);
            },
            format: 'Updated boss for {{gymName}} to be {{bossName}}',
            getDefaultFormatter: AddCommandBase._getDefaultFormatter,
        });
    }
}

export function getAddCommands(): CommandsByName<AddCommands, PogoContext> {
    return {
        activeWithTimeLeft: new AddActiveWithTimeLeftCommand(),
        updateBoss: new UpdateRaidBossCommand(),
        upcomingWithStartTime: new AddUpcomingWithStartTimeCommand(),
        upcomingWithTimer: new AddUpcomingWithTimerCommand(),
    };
}

export function getAddCommandProcessor(): CommandProcessor<AddCommands, PogoContext> {
    return new CommandProcessor(
        getAddCommands(),
        ['upcomingWithStartTime', 'upcomingWithTimer', 'activeWithTimeLeft', 'updateBoss'],
    );
}

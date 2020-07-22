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

import * as Converters from '../../utils/converters';
import * as PogoConverters from '../../pogo/converters/pogoConverters';
import * as TimeConverters from '../../time/timeConverters';

import { ParsedCommand, ParserBuilder } from '../../commands/commandParser';
import { RaidManagerCommandHandler, RaidManagerCommandProcessor } from './raidManagerCommand';
import { Result, allSucceed, captureResult, fail, succeed } from '../../utils/result';
import { Boss } from '../boss';
import { CommandSpec } from '../../commands/commandProcessor';
import { Gym } from '../gym';
import { RaidLookupOptions } from '../raidDirectory';
import { RaidManager } from '../raidManager';
import { RaidTier } from '../pogo';
import { commonProperties } from './common';

export interface AddCommandFields {
    gym: string|Gym;
    boss?: string|Boss;
    startTime?: Date;
    timer?: number;
    tier?: RaidTier;
}

export const addCommandFields = Converters.object<AddCommandFields>({
    gym: Converters.string,
    boss: Converters.string,
    startTime: TimeConverters.flexTime,
    timer: Converters.number,
    tier: PogoConverters.raidTier,
}, ['boss', 'startTime', 'timer', 'tier']);

export const DEFAULT_RAID_TIER = 5;

type AddCommandType = 'eggWithStartTime'|'eggWithTimer'|'bossWithTimeLeft'|'updateBoss';

export class AddCommandHandler implements RaidManagerCommandHandler<AddCommandHandler> {
    public readonly type: AddCommandType;
    public readonly init: AddCommandFields;
    public readonly command: CommandSpec<AddCommandFields, AddCommandHandler>

    protected constructor(command: CommandSpec<AddCommandFields, AddCommandHandler>, type: AddCommandType, init: AddCommandFields) {
        this.command = command;
        this.type = type;
        this.init = init;
    }

    public static create(command: CommandSpec<AddCommandFields, AddCommandHandler>, type: AddCommandType, init: AddCommandFields): Result<AddCommandHandler> {
        return captureResult(() => new AddCommandHandler(command, type, init));
    }

    public execute(rm: RaidManager, _options?: RaidLookupOptions): Result<string> {
        switch (this.type) {
            case 'eggWithStartTime':
                return rm.addFutureRaid(this.init.startTime as Date, this.init.gym as string, this.init.tier ?? DEFAULT_RAID_TIER).onSuccess((r) => {
                    return succeed(`Added tier ${r.tier} raid at ${r.gymName}`);
                });
            case 'eggWithTimer':
                return rm.addFutureRaid(this.init.timer as number, this.init.gym as string, this.init.tier ?? DEFAULT_RAID_TIER).onSuccess((r) => {
                    return succeed(`Added tier ${r.tier} raid at ${r.gymName}`);
                });
            case 'bossWithTimeLeft':
                return rm.addActiveRaid(this.init.timer as number, this.init.gym, this.init.boss as Boss).onSuccess((r) => {
                    // istanbul ignore next
                    return succeed(`Added ${r.bossName} at ${r.gymName}`);
                });
            case 'updateBoss':
                return rm.updateRaid(this.init.gym, this.init.boss as Boss).onSuccess((r) => {
                    // istanbul ignore next
                    return succeed(`Updated boss for ${r.gymName} to be ${r.bossName}`);
                });
        }
    }

    public validate(rm: RaidManager): Result<AddCommandHandler> {
        const results: Result<unknown>[] = [];

        // istanbul ignore else
        if (typeof this.init.gym === 'string') {
            results.push(rm.getGyms(this.init.gym).singleItem().onSuccess((gym) => {
                this.init.gym = gym;
                return succeed(gym);
            }).onFailure((message) => {
                return fail(`${this.type} gym: ${message}`);
            }));
        }
        if (typeof this.init.boss === 'string') {
            results.push(rm.getBosses(this.init.boss).singleItem().onSuccess((boss) => {
                this.init.boss = boss;
                return succeed(boss);
            }).onFailure((message) => {
                return fail(`${this.type} boss: ${message}`);
            }));
        }
        return allSucceed(results, this);
    }
}

const builder = new ParserBuilder({
    gym: commonProperties.place,
    boss: commonProperties.boss,
    startTime: commonProperties.time,
    timer: commonProperties.timer,
    tier: commonProperties.tier,
});

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

export const addCommands: CommandSpec<AddCommandFields, AddCommandHandler>[] = [
    {
        name: 'Add egg with start time',
        description: 'Add an unhatched egg with start time and optional tier',
        examples: [
            '  !add [<tier>] <gym name> (at|@) <time>',
            '  !add wells fargo at 1012',
            '  !add 4 painted parking lot at 1012am',
            '  !add t3 elephants @ 1732',
            ...commonHelp,
        ],
        parser: builder.build('!add {{tier?}} {{gym}} (?:@|at) {{startTime}}').getValueOrThrow(),
        handleCommand: (parsed: ParsedCommand<AddCommandFields>, command: CommandSpec<AddCommandFields, AddCommandHandler>): Result<AddCommandHandler> => {
            return addCommandFields.convert(parsed).onSuccess((p) => AddCommandHandler.create(command, 'eggWithStartTime', p));
        },
    },
    {
        name: 'add egg with timer',
        description: 'Add an unhatched egg with time-to-hatch and an optional tier',
        examples: [
            '  !add [<tier>] <gym name> in <time in minutes>',
            '  !add wells fargo in 15',
            '  !add 4 painted parking lot in 30',
            '  !add t3 elephants in 11',
            ...commonHelp,
        ],
        parser: builder.build('!add {{tier?}} {{gym}} in {{timer}}').getValueOrThrow(),
        handleCommand: (parsed: ParsedCommand<AddCommandFields>, command: CommandSpec<AddCommandFields, AddCommandHandler>): Result<AddCommandHandler> => {
            return addCommandFields.convert(parsed).onSuccess((p) => AddCommandHandler.create(command, 'eggWithTimer', p));
        },
    },
    {
        name: 'add boss with timer',
        description: 'Add or update an active raid:',
        examples: [
            '  !add <boss> (at|@) <gym name> <time in minutes> left',
            '  !add lugia at wells 30 left',
            '  !add ho-oh at city hall 10 left',
            ...commonHelp,
        ],
        parser: builder.build('!add {{boss}} at {{gym}} {{timer}} left').getValueOrThrow(),
        handleCommand: (parsed: ParsedCommand<AddCommandFields>, command: CommandSpec<AddCommandFields, AddCommandHandler>): Result<AddCommandHandler> => {
            return addCommandFields.convert(parsed).onSuccess((p) => AddCommandHandler.create(command, 'bossWithTimeLeft', p));
        },
    },
    {
        name: 'update boss for active raid',
        description: 'Add a boss to a hatched egg',
        examples: [
            '  !add <boss> (at|@) <gym name>',
            '  !add tyranitar at wells',
            ...commonHelp,
        ],
        parser: builder.build('!add {{boss}} at {{gym}}').getValueOrThrow(),
        handleCommand: (parsed: ParsedCommand<AddCommandFields>, command: CommandSpec<AddCommandFields, AddCommandHandler>): Result<AddCommandHandler> => {
            return addCommandFields.convert(parsed).onSuccess((p) => AddCommandHandler.create(command, 'updateBoss', p));
        },
    },
];

export class AddCommandProcessor extends RaidManagerCommandProcessor<AddCommandFields, AddCommandHandler> {
    public constructor(rm: RaidManager) {
        super(rm, '!add', addCommands);
    }
}

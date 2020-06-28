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
import * as PogoConverters from '../pogoConverters';

import { ParsedCommand, ParserBuilder } from '../../commands/regExpBuilder';
import { RaidManagerCommandHandler, RaidManagerCommandProcessor } from './raidManagerCommand';
import { Result, captureResult, fail, succeed } from '../../utils/result';
import { CommandSpec } from '../../commands/commandProcessor';
import { RaidLookupOptions } from '../raidDirectory';
import { RaidManager } from '../raidManager';
import { RaidTier } from '../pogo';
import { commonProperties } from './common';

export type BossStatusFilter = 'active'|'inactive'|'all';

export interface InfoCommandFields {
    boss?: string;
    gym: string;
    places?: string[];
    status?: BossStatusFilter;
    tier?: RaidTier;
}

export const infoCommandFields = Converters.object<InfoCommandFields>({
    boss: Converters.string,
    gym: Converters.string,
    places: Converters.arrayOf(Converters.string),
    status: Converters.enumeratedValue<BossStatusFilter>(['active', 'inactive', 'all']),
    tier: PogoConverters.raidTier,
}, ['boss', 'gym', 'places', 'status', 'tier']);

type InfoCommandType = 'boss'|'bosses'|'gym'|'gyms'|'city'|'cities'|'zone'|'zones';

export class InfoCommandHandler implements RaidManagerCommandHandler<InfoCommandHandler> {
    public readonly type: InfoCommandType;
    public readonly init: InfoCommandFields;
    public readonly command: CommandSpec<InfoCommandFields, InfoCommandHandler>

    protected constructor(command: CommandSpec<InfoCommandFields, InfoCommandHandler>, type: InfoCommandType, init: InfoCommandFields) {
        this.command = command;
        this.type = type;
        this.init = init;
    }

    public static create(command: CommandSpec<InfoCommandFields, InfoCommandHandler>, type: InfoCommandType, init: InfoCommandFields): Result<InfoCommandHandler> {
        return captureResult(() => new InfoCommandHandler(command, type, init));
    }

    public execute(rm: RaidManager, _options?: RaidLookupOptions): Result<string> {
        switch (this.type) {
            case 'boss':
                if (this.init.boss === undefined) {
                    return fail('Error: undefined boss');
                }
                return rm.getBosses(this.init.boss).bestItem().onSuccess((boss) => {
                    return succeed(`Got boss ${boss.name}`);
                });
            case 'bosses':
            case 'gym':
            case 'gyms':
            case 'city':
            case 'cities':
            case 'zone':
            case 'zones':
                return fail(`!info ${this.type} not implemented yet.`);
        }
    }

    public validate(_rm: RaidManager): Result<InfoCommandHandler> {
        return succeed(this);
    }
}

const builder = new ParserBuilder({
    boss: commonProperties.boss,
    gym: commonProperties.place,
    places: commonProperties.places,
    status: { value: '(?:active|inactive|all)' },
    tier: commonProperties.tier,
});

export const infoCommands: CommandSpec<InfoCommandFields, InfoCommandHandler>[] = [
    {
        name: 'Get boss info',
        description: 'Gets detailed information about a single boss',
        examples: [
            '  !info boss <boss name> [<tier>] [<active|inactive|all>]',
            '  !info boss kyogre',
            '  !info boss raichu active',
            '  !info boss zapdos T4',
        ],
        parser: builder.build('!info\\s+boss {{boss}} {{tier?}} {{status?}}').getValueOrThrow(),
        handleCommand: (parsed: ParsedCommand<InfoCommandFields>, command: CommandSpec<InfoCommandFields, InfoCommandHandler>): Result<InfoCommandHandler> => {
            return infoCommandFields.convert(parsed).onSuccess((p) => InfoCommandHandler.create(command, 'boss', p));
        },
    },
];

export class InfoCommandProcessor extends RaidManagerCommandProcessor<InfoCommandFields, InfoCommandHandler> {
    public constructor(rm: RaidManager) {
        super(rm, '!info', infoCommands);
    }
}

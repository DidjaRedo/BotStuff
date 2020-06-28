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

import * as Converters from '../../utils/converters';

import { ParsedCommand, ParserBuilder } from '../../commands/regExpBuilder';
import { RaidManagerCommandHandler, RaidManagerCommandProcessor } from './raidManagerCommand';
import { Result, captureResult, succeed } from '../../utils/result';
import { CommandSpec } from '../../commands/commandProcessor';
import { RaidLookupOptions } from '../raidDirectory';
import { RaidManager } from '../raidManager';
import { commonProperties } from './common';

export interface RemoveCommandFields {
    gym: string;
}

export const removeCommandFields = Converters.object<RemoveCommandFields>({
    gym: Converters.string,
});

export class RemoveCommandHandler implements RaidManagerCommandHandler<RemoveCommandHandler> {
    public readonly init: RemoveCommandFields;
    public readonly command: CommandSpec<RemoveCommandFields, RemoveCommandHandler>

    protected constructor(command: CommandSpec<RemoveCommandFields, RemoveCommandHandler>, init: RemoveCommandFields) {
        this.command = command;
        this.init = init;
    }

    public static create(command: CommandSpec<RemoveCommandFields, RemoveCommandHandler>, init: RemoveCommandFields): Result<RemoveCommandHandler> {
        return captureResult(() => new RemoveCommandHandler(command, init));
    }

    public execute(rm: RaidManager, _options?: RaidLookupOptions): Result<string> {
        return rm.removeRaid(this.init.gym).onSuccess((raid) => {
            return succeed(`Removed raid at ${raid.gym.name}`);
        });
    }

    public validate(_rm: RaidManager): Result<RemoveCommandHandler> {
        return succeed(this);
    }
}

const builder = new ParserBuilder({
    gym: commonProperties.place,
});

export const removeCommands: CommandSpec<RemoveCommandFields, RemoveCommandHandler>[] = [
    {
        name: 'Remove raid',
        description: 'Removes a raid',
        examples: [
            '  !remove <gym name>',
            '  !remove painted',
        ],
        parser: builder.build('!remove {{gym}}').getValueOrThrow(),
        handleCommand: (parsed: ParsedCommand<RemoveCommandFields>, command: CommandSpec<RemoveCommandFields, RemoveCommandHandler>): Result<RemoveCommandHandler> => {
            return removeCommandFields.convert(parsed).onSuccess((p) => RemoveCommandHandler.create(command, p));
        },
    },
];

export class RemoveCommandProcessor extends RaidManagerCommandProcessor<RemoveCommandFields, RemoveCommandHandler> {
    public constructor(rm: RaidManager) {
        super(rm, '!remove', removeCommands);
    }
}

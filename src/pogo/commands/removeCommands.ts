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

import { CommandInitializer, CommandProcessor, CommandsByName, GenericCommand } from '../../commands';
import { FormatTargets, Formatter, Result, succeed } from '@fgv/ts-utils';
import { PogoContext, commonProperties } from './common';

import { ParserBuilder } from '../../commands';
import { Raid } from '..';
import { raidFormatters } from '../formatters';

interface Tokens {
    gym: string;
}

const builder = new ParserBuilder<Tokens>({
    gym: commonProperties.place,
});

export interface RemoveCommands {
    removeRaid: Raid;
}

export type RemoveCommandNames = keyof RemoveCommands;
export type Params = Tokens;

export type RemoveCommandInitializer = CommandInitializer<RemoveCommandNames>;

export class RemoveCommand extends GenericCommand<RemoveCommandNames, Tokens, PogoContext, Params, Raid> {
    public constructor() {
        super({
            name: 'removeRaid',
            repeatable: false,
            description: ['Remove a raid'],
            examples: [
                '  !remove <gym name>',
                '  !remove painted',
            ],
            parser: builder.build('!remove {{gym}}').getValueOrThrow(),
            getConverter: () => Converters.object({
                gym: Converters.string,
            }),
            execute: (p, c) => c.rm.removeRaid(p.gym),
            format: 'Removed raid at {{gymName}}',
            getDefaultFormatter: RemoveCommand._getDefaultFormatter,
        });
    }

    protected static _getDefaultFormatter(target: FormatTargets): Result<Formatter<Raid>> {
        return succeed(raidFormatters[target]);
    }
}

export function getRemoveCommands(): CommandsByName<RemoveCommands, PogoContext> {
    return {
        removeRaid: new RemoveCommand(),
    };
}

export function getRemoveCommandProcessor(): CommandProcessor<RemoveCommands, PogoContext> {
    return new CommandProcessor(
        getRemoveCommands(),
        ['removeRaid'],
    );
}

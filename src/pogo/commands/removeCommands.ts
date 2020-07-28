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

import {
    CommandGroup,
    CommandInitializer,
    CommandProcessor,
    Commands,
    ParserBuilder,
} from '../../commands';
import { Raid, RaidManager } from '..';
import { RaidCommand, commonProperties } from './common';


interface Fields {
    gym: string;
}

const builder = new ParserBuilder<Fields>({
    gym: commonProperties.place,
});

export interface RemoveCommands {
    removeRaid: Raid;
}

export type RemoveCommandType = keyof RemoveCommands;

export type RemoveCommandInitializer = CommandInitializer<RemoveCommandType, Fields, Fields, Raid>;

export function removeCommandInitializer(rm: RaidManager): RemoveCommandInitializer {
    return {
        name: 'removeRaid',
        description: 'Remove a raid',
        examples: [
            '  !remove <gym name>',
            '  !remove painted',
        ],
        parser: builder.build('!remove {{gym}}').getValueOrThrow(),
        converter: Converters.object({
            gym: Converters.string,
        }),
        executor: (params: Fields) => {
            return rm.removeRaid(params.gym);
        },
        formatter: (_raid: Raid): string => {
            return 'Removed raid at {{gymName}}';
        },
    };
}

export function getRemoveCommands(rm: RaidManager): Commands<RemoveCommands> {
    return {
        removeRaid: new RaidCommand(removeCommandInitializer(rm)),
    };
}

export function getRemoveCommandProcessor(rm: RaidManager): CommandProcessor<RemoveCommands> {
    return new CommandProcessor(
        getRemoveCommands(rm),
        ['removeRaid'],
    );
}

export function getRemoveCommandGroup(rm: RaidManager): CommandGroup<RemoveCommandType, Raid> {
    return new CommandGroup([
        new RaidCommand(removeCommandInitializer(rm)),
    ]);
}

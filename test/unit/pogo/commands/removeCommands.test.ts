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

import '@fgv/ts-utils-jest';

import {
    RemoveCommands,
    getRemoveCommandProcessor,
} from '../../../../src/pogo/commands';

import { ExecuteResults } from '../../../../src/commands';
import { Raid } from '../../../../src/pogo/raid';
import { TestRaidManager } from '../../../helpers/pogoHelpers';

describe('remove command', () => {
    test('successfully removes an active raid', () => {
        const tests = [
            { command: '!remove northstar', expected: /removed raid.*northstar/i },
        ];
        for (const test of tests) {
            const { rm } = TestRaidManager.setup(['northstar|active|5', 'painted|active|3']);
            const context = { rm };
            const removeProcessor = getRemoveCommandProcessor();
            const formatters = removeProcessor.getDefaultFormatters('text').getValueOrThrow();

            expect(removeProcessor.executeOne(test.command, context)).toSucceedAndSatisfy(
                (cmds: ExecuteResults<RemoveCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['removeRaid'],
                        executed: {
                            removeRaid: {
                                command: 'removeRaid',
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                _value: expect.any(Raid),
                                format: expect.stringMatching(/removed raid/i),
                            },
                        },
                        executionErrors: [],
                    }));
                    expect(removeProcessor.format('removeRaid', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        }
    });

    test('fails for invalid commnds', () => {
        [
            { command: '!move painted', expected: /no command matched/i },
            { command: '!remove xyzzy', expected: /no gyms match/i },
            { command: '!remove @', expected: /no command matched/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup(['northstar|active|5', 'painted|active|3']);
            const context = { rm };

            const removeProcessor = getRemoveCommandProcessor();
            expect(removeProcessor.executeOne(test.command, context)).toFailWith(test.expected);
        });
    });
});


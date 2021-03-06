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
    AddCommands,
    getAddCommandProcessor,
} from '../../../../src/pogo/commands';
import { TestRaid, TestRaidManager } from '../../../helpers/pogoHelpers';

import { ExecuteResults } from '../../../../src/commands';
import { Raid } from '../../../../src/pogo/raid';
import { getFlexTimeSpecs } from '../../../helpers/timeHelpers';
import { raidFormatters } from '../../../../src/pogo/formatters/raidFormatter';

describe('add commands', () => {
    test('successfully process valid egg commands with hatch time', () => {
        const futureSpecs = getFlexTimeSpecs(TestRaid.getStartTime('upcoming'));
        for (const time of futureSpecs) {
            [
                { command: `!add prescott at ${time}`, expected: /added T5 raid/i },
                { command: `!add T3 city hall at ${time}`, expected: /added T3 raid/i },
                { command: `!add 2 jillyann @ ${time}`, expected: /added T2 raid/i },
            ].forEach((test) => {
                const { rm } = TestRaidManager.setup([]);
                const context = { rm };

                const addProcessor = getAddCommandProcessor();
                const formatters = addProcessor.getDefaultFormatters('text').getValueOrThrow();

                expect(addProcessor.executeOne(test.command, context)).toSucceedAndSatisfy(
                    (cmds: ExecuteResults<AddCommands>) => {
                        expect(cmds).toEqual(expect.objectContaining({
                            keys: ['upcomingWithStartTime'],
                            executed: {
                                upcomingWithStartTime: {
                                    command: 'upcomingWithStartTime',
                                    // eslint-disable-next-line @typescript-eslint/naming-convention
                                    _value: expect.any(Raid),
                                    format: expect.stringMatching(/added.*raid/i),
                                },
                            },
                            executionErrors: [],
                        }));
                        expect(addProcessor.format('upcomingWithStartTime', cmds, formatters)).toSucceedWith(test.expected);
                    }
                );
            });
        }
    });

    test('successfully process valid egg commands with a timer', () => {
        [
            { command: '!add L2 painted in 10', expected: /added T2 raid/i },
            { command: '!add library in 30', expected: /added T5 raid/i },
            { command: '!add t5 erratic in 20', expected: /added T5 raid/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup([]);
            const context = { rm };

            const addProcessor = getAddCommandProcessor();
            const formatters = addProcessor.getDefaultFormatters('text').getValueOrThrow();

            expect(addProcessor.executeOne(test.command, context)).toSucceedAndSatisfy(
                (cmds: ExecuteResults<AddCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['upcomingWithTimer'],
                        executed: {
                            upcomingWithTimer: expect.objectContaining({
                                command: 'upcomingWithTimer',
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                _value: expect.any(Raid),
                                format: expect.stringMatching(/added.*raid/i),
                            }),
                        },
                        executionErrors: [],
                    }));
                    expect(addProcessor.format('upcomingWithTimer', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        });
    });

    test('successfully add an active raid with a boss', () => {
        [
            { command: '!add lugia at painted 30 left', expected: /added lugia at/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup([]);
            const context = { rm };

            const addProcessor = getAddCommandProcessor();
            const formatters = addProcessor.getDefaultFormatters('text').getValueOrThrow();
            expect(addProcessor.executeOne(test.command, context)).toSucceedAndSatisfy(
                (cmds: ExecuteResults<AddCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['activeWithTimeLeft'],
                        executed: {
                            activeWithTimeLeft: expect.objectContaining({
                                command: 'activeWithTimeLeft',
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                _value: expect.any(Raid),
                                format: expect.stringMatching(/added.*at/i),
                            }),
                        },
                        executionErrors: [],
                    }));
                    expect(addProcessor.format('activeWithTimeLeft', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        });
    });


    test('successfully add a boss to an active raid', () => {
        [
            { command: '!add groudon at northstar', expected: /updated boss.*groudon/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup(['northstar|active|5', 'painted|active|3']);
            const context = { rm };

            const addProcessor = getAddCommandProcessor();
            const formatters = addProcessor.getDefaultFormatters('text').getValueOrThrow();

            expect(addProcessor.executeOne(test.command, context)).toSucceedAndSatisfy(
                (cmds: ExecuteResults<AddCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['updateBoss'],
                        executed: {
                            updateBoss: expect.objectContaining({
                                command: 'updateBoss',
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                _value: expect.any(Raid),
                                format: expect.stringMatching(/updated/i),
                            }),
                        },
                        executionErrors: [],
                    }));
                    expect(addProcessor.format('updateBoss', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        });
    });

    test('fails for invalid commnds', () => {
        [
            { command: '!aad painted in 30', expected: /no command matched/i },
            { command: '!add T3 starbucks in 30', expected: /matches/i },
            { command: '!add northstar at 12345', expected: /not found/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup(['northstar|active|5', 'painted|active|3']);
            const context = { rm };

            const addProcessor = getAddCommandProcessor();
            expect(addProcessor.executeOne(test.command, context)).toFailWith(test.expected);
        });
    });

    describe('AddCommandProcessor', () => {
        const addProcessor = getAddCommandProcessor();
        describe('getDefaultFormatters', () => {
            test('gets the correct text formatters', () => {
                expect(addProcessor.getDefaultFormatters('text')).toSucceedWith({
                    upcomingWithStartTime: raidFormatters.text,
                    upcomingWithTimer: raidFormatters.text,
                    activeWithTimeLeft: raidFormatters.text,
                    updateBoss: raidFormatters.text,
                });
            });

            test('gets the correct markdown formatters', () => {
                expect(addProcessor.getDefaultFormatters('markdown')).toSucceedWith({
                    upcomingWithStartTime: raidFormatters.markdown,
                    upcomingWithTimer: raidFormatters.markdown,
                    activeWithTimeLeft: raidFormatters.markdown,
                    updateBoss: raidFormatters.markdown,
                });
            });

            test('gets the correct embed formatters', () => {
                expect(addProcessor.getDefaultFormatters('embed')).toSucceedWith({
                    upcomingWithStartTime: raidFormatters.embed,
                    upcomingWithTimer: raidFormatters.embed,
                    activeWithTimeLeft: raidFormatters.embed,
                    updateBoss: raidFormatters.embed,
                });
            });
        });
    });
});


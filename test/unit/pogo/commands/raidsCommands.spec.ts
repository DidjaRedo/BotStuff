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

import '../../../helpers/jestHelpers';
import { ExecutedCommandsResult, ResultFormatters } from '../../../../src/commands/commandProcessor';
import { Raid, RaidState } from '../../../../src/pogo/raid';
import { RaidsCommands, getRaidsCommandProcessor } from '../../../../src/pogo/commands/raidCommands';
import { TestRaidManager } from '../../../helpers/pogoHelpers';
import { categorizedRaidsFormatters } from '../../../../src/pogo/formatters/raidFormatter';

const formatters: ResultFormatters<RaidsCommands> = {
    allRaids: categorizedRaidsFormatters.text,
    exRaids: categorizedRaidsFormatters.text,
    byTier: categorizedRaidsFormatters.text,
    defaultRaids: categorizedRaidsFormatters.text,
};

interface RaidsTestCase {
    command: string;
    expectedRaids: Record<RaidState, Raid[]>;
    expected: RegExp|undefined;
}
const raidStates: RaidState[] = ['active', 'upcoming', 'future', 'expired'];

describe('raids commands', () => {
    const { rm } = TestRaidManager.setup([
        'northstar|active|5|boss', // EX
        'overlake starbucks|upcoming|5', // EX
        'eastside harley|upcoming|2', // non-EX
        'cornish|active|4', // non-EX
        'cow and the coyote|active|3|boss', // non-EX
        'painted|upcoming|3', // EX
        'printed circuits|future|5', // non-EX
        'stone pyramid|expired|1|boss', // non-EX
    ]);
    const raids = {
        northstar: rm.getRaid('northstar').getValueOrThrow(),
        starbucks: rm.getRaid('overlake starbucks').getValueOrThrow(),
        harley: rm.getRaid('eastside harley').getValueOrThrow(),
        cornish: rm.getRaid('cornish').getValueOrThrow(),
        cowAndCoyote: rm.getRaid('cow and the coyote').getValueOrThrow(),
        painted: rm.getRaid('painted').getValueOrThrow(),
        printedCircuits: rm.getRaid('printed circuits').getValueOrThrow(),
        stonePyramid: rm.getRaid('stone pyramid').getValueOrThrow(),
    };

    it('should successfully process valid "all raids" commands, with or without cities', () => {
        const tests: RaidsTestCase[] = [
            {
                command: '!raids all',
                expectedRaids: {
                    expired: [raids.stonePyramid], // expired
                    active: [raids.cornish, raids.cowAndCoyote, raids.northstar], // hatched
                    upcoming: [raids.harley, raids.starbucks, raids.painted], // egg
                    future: [raids.printedCircuits], // future
                },
                expected: /.*/i,
            },
            {
                command: '!raids all in redmond',
                expectedRaids: {
                    expired: [],
                    active: [raids.northstar],
                    upcoming: [raids.painted],
                    future: [],
                },
                expected: /.*/i,
            },
            {
                command: '!raids all in redmond, kirkland',
                expectedRaids: {
                    expired: [],
                    active: [raids.cowAndCoyote, raids.northstar],
                    upcoming: [raids.painted],
                    future: [],
                },
                expected: /.*/i,
            },
            {
                command: '!raids all in rain city',
                expectedRaids: {
                    expired: [raids.stonePyramid],
                    active: [raids.cowAndCoyote, raids.northstar],
                    upcoming: [raids.harley, raids.starbucks, raids.painted],
                    future: [raids.printedCircuits],
                },
                expected: /.*/i,
            },
        ];

        for (const test of tests) {
            const raidsProcessor = getRaidsCommandProcessor(rm);
            expect(raidsProcessor.processOne(test.command)).toSucceedWithCallback(
                (cmds: ExecutedCommandsResult<RaidsCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['allRaids'],
                        executed: {
                            allRaids: expect.objectContaining({
                                command: 'allRaids',
                                result: expect.anything(),
                                message: expect.any(String),
                            }),
                        },
                    }));

                    if (test.expectedRaids) {
                        for (const type of raidStates) {
                            const want = test.expectedRaids[type].map((r) => r.gymName);
                            const got = (cmds?.executed?.allRaids?.result[type] ?? []).map((r: Raid) => r.gymName);
                            const wantDescription = `${type}: ${want.join(', ')}`;
                            const gotDescription = `${type}: ${got.join(', ')}`;
                            expect(gotDescription).toEqual(wantDescription);
                        }
                    }

                    expect(raidsProcessor.format('allRaids', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        }
    });

    it('should successfully process valid "EX raids" commands, with or without cities', () => {
        const tests: RaidsTestCase[] = [
            {
                command: '!raids ex',
                expectedRaids: {
                    expired: [], // expired
                    active: [raids.northstar], // hatched
                    upcoming: [raids.starbucks, raids.painted], // egg
                    future: [], // future
                },
                expected: /.*/i,
            },
            {
                command: '!raids ex in redmond, kirkland',
                expectedRaids: {
                    expired: [],
                    active: [raids.northstar],
                    upcoming: [raids.painted],
                    future: [],
                },
                expected: /.*/i,
            },
            {
                command: '!raids ex in rain city',
                expectedRaids: {
                    expired: [],
                    active: [raids.northstar],
                    upcoming: [raids.starbucks, raids.painted],
                    future: [],
                },
                expected: /.*/i,
            },
        ];

        for (const test of tests) {
            const raidsProcessor = getRaidsCommandProcessor(rm);
            expect(raidsProcessor.processOne(test.command)).toSucceedWithCallback(
                (cmds: ExecutedCommandsResult<RaidsCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['exRaids'],
                        executed: {
                            exRaids: expect.objectContaining({
                                command: 'exRaids',
                                result: expect.anything(),
                                message: expect.any(String),
                            }),
                        },
                    }));

                    if (test.expectedRaids) {
                        for (const type of raidStates) {
                            const want = test.expectedRaids[type].map((r) => r.gymName);
                            const got = (cmds?.executed?.exRaids?.result[type] ?? []).map((r: Raid) => r.gymName);
                            const wantDescription = `${type}: ${want.join(', ')}`;
                            const gotDescription = `${type}: ${got.join(', ')}`;
                            expect(gotDescription).toEqual(wantDescription);
                        }
                    }

                    expect(raidsProcessor.format('exRaids', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        }
    });

    it('should successfully process valid "raids by tier" commands, with or without cities', () => {
        const tests: RaidsTestCase[] = [
            {
                command: '!raids 3+',
                expectedRaids: {
                    expired: [], // expired
                    active: [raids.cornish, raids.cowAndCoyote, raids.northstar], // hatched
                    upcoming: [raids.starbucks, raids.painted], // egg
                    future: [raids.printedCircuits], // future
                },
                expected: /.*/i,
            },
            {
                command: '!raids 5 in redmond',
                expectedRaids: {
                    expired: [],
                    active: [raids.northstar],
                    upcoming: [],
                    future: [],
                },
                expected: /.*/i,
            },
            {
                command: '!raids 2-3 in redmond, kirkland',
                expectedRaids: {
                    expired: [],
                    active: [raids.cowAndCoyote],
                    upcoming: [raids.painted],
                    future: [],
                },
                expected: /.*/i,
            },
            {
                command: '!raids 4+ in rain city',
                expectedRaids: {
                    expired: [],
                    active: [raids.northstar],
                    upcoming: [raids.starbucks],
                    future: [raids.printedCircuits],
                },
                expected: /.*/i,
            },
        ];

        for (const test of tests) {
            const raidsProcessor = getRaidsCommandProcessor(rm);
            expect(raidsProcessor.processOne(test.command)).toSucceedWithCallback(
                (cmds: ExecutedCommandsResult<RaidsCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['byTier'],
                        executed: {
                            byTier: expect.objectContaining({
                                command: 'byTier',
                                result: expect.anything(),
                                message: expect.any(String),
                            }),
                        },
                    }));

                    if (test.expectedRaids) {
                        for (const type of raidStates) {
                            const want = test.expectedRaids[type].map((r) => r.gymName);
                            const got = (cmds?.executed?.byTier?.result[type] ?? []).map((r: Raid): string => r.gymName);
                            const wantDescription = `${type}: ${want.join(', ')}`;
                            const gotDescription = `${type}: ${got.join(', ')}`;
                            expect(gotDescription).toEqual(wantDescription);
                        }
                    }

                    expect(raidsProcessor.format('byTier', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        }
    });

    it('should successfully process valid "default raids" (T4+) commands, with or without cities', () => {
        const tests: RaidsTestCase[] = [
            {
                command: '!raids',
                expectedRaids: {
                    expired: [], // expired
                    active: [raids.cornish, raids.northstar], // hatched
                    upcoming: [raids.starbucks], // egg
                    future: [raids.printedCircuits], // future
                },
                expected: /.*/i,
            },
            {
                command: '!raids in redmond',
                expectedRaids: {
                    expired: [],
                    active: [raids.northstar],
                    upcoming: [],
                    future: [],
                },
                expected: /.*/i,
            },
            {
                command: '!raids in redmond, kirkland',
                expectedRaids: {
                    expired: [],
                    active: [raids.northstar],
                    upcoming: [],
                    future: [],
                },
                expected: /.*/i,
            },
            {
                command: '!raids in rain city',
                expectedRaids: {
                    expired: [],
                    active: [raids.northstar],
                    upcoming: [raids.starbucks],
                    future: [raids.printedCircuits],
                },
                expected: /.*/i,
            },
        ];

        for (const test of tests) {
            const raidsProcessor = getRaidsCommandProcessor(rm);
            expect(raidsProcessor.processOne(test.command)).toSucceedWithCallback(
                (cmds: ExecutedCommandsResult<RaidsCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['defaultRaids'],
                        executed: {
                            defaultRaids: expect.objectContaining({
                                command: 'defaultRaids',
                                result: expect.anything(),
                                message: expect.any(String),
                            }),
                        },
                    }));

                    if (test.expectedRaids) {
                        for (const type of raidStates) {
                            const want = test.expectedRaids[type].map((r) => r.gymName);
                            const got = (cmds?.executed?.defaultRaids?.result[type] ?? []).map((r: Raid): string => r.gymName);
                            const wantDescription = `${type}: ${want.join(', ')}`;
                            const gotDescription = `${type}: ${got.join(', ')}`;
                            expect(gotDescription).toEqual(wantDescription);
                        }
                    }

                    expect(raidsProcessor.format('defaultRaids', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        }
    });

    it('should fail for invalid commands', () => {
        [
            { command: '!raids all 3+', expected: /no command matched/i },
            { command: '!raids all in narnia', expected: /narnia.*not a city or zone/i },
        ].forEach((test) => {
            const raidsProcessor = getRaidsCommandProcessor(rm);
            expect(raidsProcessor.processOne(test.command)).toFailWith(test.expected);
        });
    });
});


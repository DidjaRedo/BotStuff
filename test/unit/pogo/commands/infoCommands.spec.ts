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
import { InfoCommands, getInfoCommandProcessor } from '../../../../src/pogo/commands/infoCommands';
import { Boss } from '../../../../src/pogo/boss';
import { TestRaidManager } from '../../../helpers/pogoHelpers';
import { bossesFormatters } from '../../../../src/pogo/formatters/bossFormatter';

const formatters: ResultFormatters<InfoCommands> = {
    boss: bossesFormatters.text,
};

describe('info command', () => {
    it('should get information about a boss specified by name', () => {
        [
            {
                command: '!info boss kyogre ',
                expected: expect.stringMatching(/T5\s+kyogre/i),
            },
            {
                command: '!info boss t4 zapdos',
                expected: expect.stringMatching(/T4\s+zapdos/i),
            },
            {
                command: '!info boss zapdos',
                expectedBosses: [expect.any(Boss), expect.any(Boss)],
                expected: expect.stringMatching(/T5\s+zapdos.*[\s\S]*T4\s+zapdos/i),
            },
            {
                command: '!info boss kyogre, lugia',
                expectedBosses: [expect.any(Boss), expect.any(Boss)],
                expected: expect.stringMatching(/T5\s+kyogre.*[\s\S]*T5\s+lugia/i),
            },
            {
                command: '!info boss t4 Exeggutor',
                expected: expect.stringContaining('Alolan'),
            },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup([]);
            const infoProcessor = getInfoCommandProcessor(rm);
            expect(infoProcessor.processOne(test.command)).toSucceedWithCallback(
                (cmds: ExecutedCommandsResult<InfoCommands>) => {
                    expect(cmds).toEqual(expect.objectContaining({
                        keys: ['boss'],
                        executed: {
                            boss: {
                                command: 'boss',
                                result: test.expectedBosses ?? [expect.any(Boss)],
                                message: expect.any(String),
                            },
                        },
                    }));
                    expect(infoProcessor.format('boss', cmds, formatters)).toSucceedWith(test.expected);
                }
            );
        });
    });

    it('should fail for invalid commnds', () => {
        [
            { command: '!inof boss kyogre', expected: /no command/i },
            { command: '!info boss xyzzy', expected: /xyzzy not found/i },
            { command: '!info boos @', expected: /no command matched/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup([]);
            const infoProcessor = getInfoCommandProcessor(rm);
            expect(infoProcessor.processOne(test.command)).toFailWith(test.expected);
        });
    });
});


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
import { TestRaid, TestRaidManager } from '../../../helpers/pogoHelpers';
import { AddCommandProcessor } from '../../../../src/pogo/commands/addCommand';
import { getFlexTimeSpecs } from '../../../helpers/timeHelpers';

describe('add commands', () => {
    it('should successfully process valid egg commands with hatch time', () => {
        const futureSpecs = getFlexTimeSpecs(TestRaid.getStartTime('egg'));
        for (const time of futureSpecs) {
            [
                { command: `!add prescott at ${time}`, expected: /added tier 5 raid/i },
                { command: `!add T3 city hall at ${time}`, expected: /added tier 3 raid/i },
                { command: `!add 2 jillyann @ ${time}`, expected: /added tier 2 raid/i },
            ].forEach((test) => {
                const { rm } = TestRaidManager.setup([]);
                const addHandler = new AddCommandProcessor(rm);
                expect(addHandler.handleCommand(test.command)).toSucceedWith(expect.stringMatching(test.expected));
            });
        }
    });

    it('should successfully process valid egg commands with a timer', () => {
        [
            { command: '!add L2 painted in 10', expected: /added tier 2 raid/i },
            { command: '!add library in 30', expected: /added tier 5 raid/i },
            { command: '!add t5 erratic in 20', expected: /added tier 5 raid/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup([]);
            const addHandler = new AddCommandProcessor(rm);
            expect(addHandler.handleCommand(test.command)).toSucceedWith(expect.stringMatching(test.expected));
        });
    });

    it('should successfully add an active raid with a boss', () => {
        [
            { command: '!add lugia at painted 30 left', expected: /added lugia at/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup([]);
            const addHandler = new AddCommandProcessor(rm);
            expect(addHandler.handleCommand(test.command)).toSucceedWith(expect.stringMatching(test.expected));
        });
    });


    it('should successfully add a boss to an active raid', () => {
        [
            { command: '!add groudon at northstar', expected: /updated boss.*groudon/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup(['northstar|hatched|5', 'painted|hatched|3']);
            const addHandler = new AddCommandProcessor(rm);
            expect(addHandler.handleCommand(test.command)).toSucceedWith(expect.stringMatching(test.expected));
        });
    });

    it('should fail for invalid commnds', () => {
        [
            { command: '!aad painted in 30', expected: /not an !add command/i },
            { command: '!add T3 starbucks in 30', expected: /matches/i },
            { command: '!add northstar at 12345', expected: /not found/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup(['northstar|hatched|5', 'painted|hatched|3']);
            const addHandler = new AddCommandProcessor(rm);
            expect(addHandler.handleCommand(test.command)).toFailWith(test.expected);
        });
    });
});


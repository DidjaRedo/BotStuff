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
import { RemoveCommandProcessor } from '../../../../src/pogo/commands/removeCommand';
import { TestRaidManager } from '../../../helpers/pogoHelpers';

describe('remove command', () => {
    it('should successfully remove an active raid', () => {
        [
            { command: '!remove northstar', expected: /removed raid/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup(['northstar|hatched|5', 'painted|hatched|3']);
            const removeHandler = new RemoveCommandProcessor(rm);
            expect(removeHandler.handleCommand(test.command)).toSucceedWith(expect.stringMatching(test.expected));
        });
    });

    it('should fail for invalid commnds', () => {
        [
            { command: '!move painted', expected: /not an !remove command/i },
            { command: '!remove xyzzy', expected: /no gyms match/i },
            { command: '!remove @', expected: /no command matched/i },
        ].forEach((test) => {
            const { rm } = TestRaidManager.setup(['northstar|hatched|5', 'painted|hatched|3']);
            const removeHandler = new RemoveCommandProcessor(rm);
            expect(removeHandler.handleCommand(test.command)).toFailWith(test.expected);
        });
    });
});


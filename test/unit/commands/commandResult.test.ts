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
import { fail, succeed } from '@fgv/ts-utils';
import { propagateCommandResult, succeedCommand } from '../../../src/commands';

describe('CommandResult', () => {
    describe('succeedCommand', () => {
        test('propagates parameters and reports succeed', () => {
            const result = succeedCommand('value', 'command', 'format');
            expect(result).toSucceedWith('value');
            expect(result.command).toBe('command');
            expect(result.format).toBe('format');
        });
    });

    describe('propagateCommandResult', () => {
        test('propagates value, command, and format for success', () => {
            const result = succeed('value');
            const commandResult = propagateCommandResult(result, 'command', 'format', 'execute');
            expect(commandResult).toSucceedWith('value');
            if (commandResult.isSuccess()) {
                expect(commandResult.command).toBe('command');
                expect(commandResult.format).toBe('format');
            }
        });

        test('propagates message and detail for failure', () => {
            const result = fail('error');
            const commandResult = propagateCommandResult(result, 'command', 'format', 'execute');
            expect(commandResult).toFailWithDetail('error', 'execute');
        });
    });
});

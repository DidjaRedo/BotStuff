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

import { DetailedFailure, DetailedSuccess, Result, failWithDetail } from '@fgv/ts-utils';

/**
 * Indicates extended details for a failed command.
 * - 'internal' indicates some kind of internal error
 * - 'parse' indicates that the command did not match syntactically
 * - 'validate' indicates that the command matched syntactically but failed some other test
 * - 'execute' indicates that the command was valid but that execution failed
 */
export type CommandFailureDetail = 'internal'|'parse'|'validate'|'execute'|'format';

export class CommandSuccess<TNAME, T> extends DetailedSuccess<T, CommandFailureDetail> {
    public readonly command: TNAME;
    public readonly format: string;

    public constructor(value: T, command: TNAME, format: string) {
        super(value);
        this.command = command;
        this.format = format;
    }

    public isSuccess(): this is CommandSuccess<TNAME, T> {
        return true;
    }
}

export function succeedCommand<TNAME, T>(value: T, command: TNAME, format: string): CommandSuccess<TNAME, T> {
    return new CommandSuccess(value, command, format);
}

export function propagateCommandResult<TNAME, T>(result: Result<T>, command: TNAME, format: string, detail: CommandFailureDetail): CommandResult<TNAME, T> {
    return result.isSuccess()
        ? succeedCommand(result.value, command, format)
        : failWithDetail(result.message, detail);
}

export type CommandResult<TNAME, T> = CommandSuccess<TNAME, T>|DetailedFailure<T, CommandFailureDetail>;

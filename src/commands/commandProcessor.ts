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

import { CommandParser, ParsedCommand } from './regExpBuilder';
import { Result, allSucceed, fail, mapSuccess, succeed } from '../utils/result';

export interface CommandResult<T> {
    found: boolean;
    result: T|undefined;
}

export type CommandValidator<TR> = (processed: TR) => Result<TR>;
export type CommandHandler<TP, TR> = (parsed: ParsedCommand<TP>, command: CommandSpec<TP, TR>) => Result<TR>;

export interface CommandSpec<TP, TR> {
    name: string;
    description: string;
    examples?: string[];
    parser: CommandParser<TP>;
    handleCommand: CommandHandler<TP, TR>;
}

export class CommandProcessor<TP, TR> {
    private _commands: CommandSpec<TP, TR>[];
    private _validator?: CommandValidator<TR>;

    public constructor(commands?: CommandSpec<TP, TR>[], validator?: CommandValidator<TR>) {
        this._commands = [];
        this._validator = validator;

        allSucceed((commands ?? []).map((c) => this.addCommand(c)), true).getValueOrThrow();
    }

    public addCommand(cmd: CommandSpec<TP, TR>): Result<boolean> {
        return this._validateSpec(cmd).onSuccess(() => {
            this._commands.push(cmd);
            return succeed(true);
        });
    }

    public processAll(message: string): Result<TR[]> {
        const results: Result<TR>[] = [];
        for (const c of this._commands) {
            const result: Result<TR|undefined> = c.parser.parse(message).onSuccess((parsed) => {
                return (parsed !== undefined) ? c.handleCommand(parsed, c) : succeed(undefined);
            }).onSuccess((processed) => {
                if ((processed !== undefined) && (this._validator !== undefined)) {
                    return this._validator(processed);
                }
                return succeed(processed);
            });

            if (result.isFailure()) {
                results.push(fail(result.message));
            }
            else if (result.value !== undefined) {
                results.push(succeed(result.value));
            }
        }
        return mapSuccess(results);
    }

    public processFirst(message: string): Result<TR> {
        const errors: Result<TR>[] = [];

        for (const c of this._commands) {
            const result = c.parser.parse(message).onSuccess((parsed) => {
                return (parsed !== undefined) ? c.handleCommand(parsed, c) : succeed(undefined);
            }).onSuccess((processed: TR): Result<TR> => {
                if ((processed !== undefined) && (this._validator !== undefined)) {
                    return this._validator(processed);
                }
                return succeed(processed);
            });

            if (result.isFailure()) {
                errors.push(result);
            }
            else if (result.isSuccess() && (result.value !== undefined)) {
                return result;
            }
        }

        const errorText = (errors.length > 0) ? `\n${errors.join('\n')}` : '';
        return fail(`No command matched ${message}${errorText}`);
    }

    public processOne(message: string): Result<TR> {
        const errors: Result<TR>[] = [];
        const results: { command: CommandSpec<TP, TR>, result: TR }[] = [];

        for (const c of this._commands) {
            const result: Result<TR|undefined> = c.parser.parse(message).onSuccess((parsed) => {
                return (parsed !== undefined) ? c.handleCommand(parsed, c) : succeed(undefined);
            }).onSuccess((processed) => {
                if ((processed !== undefined) && (this._validator !== undefined)) {
                    return this._validator(processed);
                }
                return succeed(processed);
            }).onSuccess((processed) => {
                if (processed !== undefined) {
                    results.push({ command: c, result: processed });
                }
                return succeed(processed);
            });

            if (result.isFailure()) {
                errors.push(fail(result.message));
            }
        }

        if (results.length < 1) {
            const errorText = (errors.length > 0) ? `\n${errors.join('\n')}` : '';
            return fail(`No command matched ${message}${errorText}`);
        }
        else if (results.length > 1) {
            const candidates = results.map((r) => r.command.name).join(', ');
            return fail(`Ambiguous command ${message} could be any of: [${candidates}]`);
        }
        return succeed(results[0].result);
    }

    public get numCommands(): number {
        return this._commands.length;
    }

    private _validateSpec(cmd: CommandSpec<TP, TR>): Result<boolean> {
        if ((!cmd.name) || (!cmd.description) || (!cmd.parser) || (!cmd.handleCommand)) {
            return fail('Command must have name, description, parser and handleCommand.');
        }

        if (typeof cmd.handleCommand !== 'function') {
            return fail('Command handler must be a function.');
        }

        if (this._commands.find((c) => c.name === cmd.name) !== undefined) {
            return fail(`Duplicate command name '${cmd.name}'.`);
        }
        return succeed(true);
    }
}

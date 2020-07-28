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

import { Command, CommandResult, ValidatedCommand } from './command';
import {
    Formatter,
    Result,
    allSucceed,
    fail,
    mapSuccess,
    succeed,
} from '@fgv/ts-utils';

export class CommandGroup<TNAME extends string|number|symbol, TRET> {
    public readonly prefix?: string;
    private _byName: Map<TNAME, Command<TNAME, TRET>>;
    private _inOrder: Command<TNAME, TRET>[];

    public constructor(commands?: Command<TNAME, TRET>[], prefix?: string) {
        this._byName = new Map();
        this._inOrder = [];
        this.prefix = prefix;

        allSucceed((commands ?? []).map((c) => this.addCommand(c)), true).getValueOrThrow();
    }

    public addCommand(cmd: Command<TNAME, TRET>): Result<boolean> {
        if (this._byName.has(cmd.name)) {
            return fail(`Duplicate command name ${cmd.name}`);
        }
        this._byName.set(cmd.name, cmd);
        this._inOrder.push(cmd);
        return succeed(true);
    }

    public couldBeCommand(command: string): boolean {
        return (this.prefix === undefined) || command.trim().startsWith(`${this.prefix} `);
    }

    public validateAll(command: string): Result<ValidatedCommand<TNAME, TRET>[]> {
        const results = this._inOrder.map((c) => c.validate(command));
        const filtered = results.filter((r): r is Result<ValidatedCommand<TNAME, TRET>> => {
            return (r !== undefined) && (r.isFailure() || (r.value !== undefined));
        });
        return mapSuccess(filtered);
    }

    public processAll(command: string): Result<CommandResult<TNAME, TRET>[]> {
        const results = this._inOrder.map((c) => c.execute(command));
        const filtered = results.filter((r): r is Result<CommandResult<TNAME, TRET>> => {
            return (r !== undefined) && (r.isFailure() || (r.value !== undefined));
        });
        return mapSuccess(filtered);
    }

    public processFirst(command: string): Result<CommandResult<TNAME, TRET>> {
        const errors: Result<CommandResult<TNAME, TRET>>[] = [];

        for (const cmd of this._inOrder) {
            const result = cmd.execute(command);
            // istanbul ignore else
            if (result !== undefined) {
                if (result.isFailure()) {
                    // typescript doesn't strip undefined from the type despite the guard above
                    errors.push(result as Result<CommandResult<TNAME, TRET>>);
                }
                else if (result.value !== undefined) {
                    return result as Result<CommandResult<TNAME, TRET>>;
                }
            }
        }

        const errorText = (errors.length > 0) ? `\n${errors.join('\n')}` : '';
        return fail(`No command matched "${command}"${errorText}`);
    }

    public processOne(command: string): Result<CommandResult<TNAME, TRET>> {
        const errors: Result<CommandResult<TNAME, TRET>>[] = [];
        const validated: ValidatedCommand<TNAME, TRET>[] = [];

        for (const cmd of this._inOrder) {
            const result = cmd.validate(command);

            if (result.isSuccess()) {
                if (result.value !== undefined) {
                    validated.push(result.value);
                }
            }
            else {
                errors.push(fail(result.message));
            }
        }

        if (validated.length < 1) {
            const errorText = (errors.length > 0) ? `\n${errors.join('\n')}` : '';
            return fail(`No command matched ${command}${errorText}`);
        }
        else if (validated.length > 1) {
            const candidates = validated.map((v) => v.command).join(', ');
            return fail(`Ambiguous command ${command} could be any of: [${candidates}]`);
        }
        return validated[0].execute();
    }

    public format(executed: CommandResult<TNAME, TRET>, formatter: Formatter<TRET>): Result<string> {
        return formatter(executed.message, executed.result);
    }

    public get numCommands(): number {
        return this._inOrder.length;
    }
}

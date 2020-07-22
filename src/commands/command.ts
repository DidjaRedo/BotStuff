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

import { FormatTargets, Formatter } from '../utils/formatter';
import { Result, fail, succeed } from '../utils/result';
import { CommandParser } from './commandParser';
import { Converter } from '../utils/converter';

export type CommandValidator<TR> = (processed: TR) => Result<TR>;
export type CommandExecutor<TSRC, TRET> = (params: TSRC) => Result<TRET>;
export type CommandFormatter<TSRC, TRET> = (result: TRET, params: TSRC) => string;

export interface CommandInitializer<TNAME, TRAW, TPROPS, TRET> {
    name: TNAME;
    description: string;
    examples?: string[];
    parser: CommandParser<TRAW>;
    converter: Converter<TPROPS>;
    executor: CommandExecutor<TPROPS, TRET>;
    formatter: CommandFormatter<TPROPS, TRET>;
}

export interface CommandResult<TKEY, TRET> {
    command: TKEY;
    result: TRET;
    message: string;
}

export interface ValidatedCommand<TNAME, TRET> {
    command: TNAME;
    execute(): Result<CommandResult<TNAME, TRET>>;
}

export interface Command<TNAME, TRET> {
    name: TNAME;
    getDescription(): string;
    getExamples(): string|undefined;
    getHelpLines(): string[];
    validate(command: string): Result<ValidatedCommand<TNAME, TRET>|undefined>;
    execute(command: string): Result<CommandResult<TNAME, TRET>|undefined>;
    format(result: CommandResult<TNAME, TRET>, formatter: Formatter<TRET>): Result<string>;
    getDefaultFormatter(target: FormatTargets): Result<Formatter<TRET>>;
}

export type Commands<T> = { [ key in keyof T]: Command<keyof T, T[key]> };
export type ValidatedCommands<T> = { [ key in keyof T]: ValidatedCommand<keyof T, T[key]> };

export class ValidatedCommandBase<TNAME, TRET> implements ValidatedCommand<TNAME, TRET> {
    public readonly command: TNAME;
    private _execute: () => Result<CommandResult<TNAME, TRET>>;

    public constructor(command: TNAME, execute: () => Result<CommandResult<TNAME, TRET>>) {
        this.command = command;
        this._execute = execute;
    }

    public execute(): Result<CommandResult<TNAME, TRET>> {
        return this._execute();
    }
}

export abstract class CommandBase<TNAME, TRAW, TPROPS, TRET> implements Command<TNAME, TRET> {
    protected _init: CommandInitializer<TNAME, TRAW, TPROPS, TRET>

    public constructor(init: CommandInitializer<TNAME, TRAW, TPROPS, TRET>) {
        this._init = init;
    }

    public get name(): TNAME {
        return this._init.name;
    }

    public getDescription(): string {
        return this._init.description;
    }

    public getExamples(): string|undefined {
        return this._init.examples?.join('\n');
    }

    public getHelpLines(): string[] {
        return [
            this._init.description,
            ...(this._init.examples ?? []),
        ];
    }

    public validate(command: string): Result<ValidatedCommandBase<TNAME, TRET>|undefined> {
        return this._init.parser.parse(command).onSuccess((parsed) => {
            if (parsed === undefined) {
                return succeed(undefined);
            }
            return this._init.converter.convert(parsed);
        }).onSuccess((params: TPROPS|undefined) => {
            if (params === undefined) {
                return succeed(undefined);
            }
            return succeed(new ValidatedCommandBase(this._init.name, () => this._execute(params)));
        });
    }

    public execute(command: string): Result<CommandResult<TNAME, TRET>|undefined> {
        return this.validate(command).onSuccess((cmd) => {
            if (cmd === undefined) {
                return succeed(undefined);
            }
            return cmd.execute();
        });
    }

    public format(result: CommandResult<TNAME, TRET>, formatter: Formatter<TRET>): Result<string> {
        if ((result.message === undefined) || (result.result === undefined)) {
            return fail(`${this._init.name}: Cannot format undefined result or message`);
        }
        return formatter(result.message, result.result);
    }

    protected _execute(params: TPROPS): Result<CommandResult<TNAME, TRET>> {
        return this._init.executor(params).onSuccess((rtrn: TRET) => {
            return succeed({
                command: this._init.name,
                result: rtrn,
                message: this._init.formatter(rtrn, params),
            });
        });
    }

    public abstract getDefaultFormatter(target: FormatTargets): Result<Formatter<TRET>>;
}

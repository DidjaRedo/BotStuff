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

import { CommandFailureDetail, CommandSuccess, propagateCommandResult } from './commandResult';
import {
    DetailedResult,
    FormatTargets,
    Formatter,
    Result,
    fail,
    failWithDetail,
    succeed,
    succeedWithDetail,
} from '@fgv/ts-utils';
import { PreprocessedCommand, PreprocessedTextCommand } from './preprocessedCommand';

import { Command } from './command';

export type CommandsByName<TCMDS, TCTX> = { [key in keyof TCMDS]: Command<keyof TCMDS, TCTX, TCMDS[key]> };
export type PreprocessedCommandsByName<TCMDS> = { [key in keyof TCMDS]: PreprocessedCommand<keyof TCMDS, TCMDS[key]> };
export type PreprocessedTextCommandsByName<TCMDS> = { [key in keyof TCMDS]: PreprocessedTextCommand };
export type CommandResultsByName<TCMDS> = { [key in keyof TCMDS]: CommandSuccess<keyof TCMDS, TCMDS[key]> };

export interface PreprocessResults<TCMDS> {
    keys: (keyof TCMDS)[];
    preprocessed: Partial<PreprocessedCommandsByName<TCMDS>>;
    preprocessErrors: string[];
}

export interface PreprocessTextResults<TCMDS> {
    keys: (keyof TCMDS)[];
    preprocessed: Partial<PreprocessedTextCommandsByName<TCMDS>>;
    preprocessErrors: string[];
}

export interface ExecuteResults<TCMDS> {
    keys: (keyof TCMDS)[];
    executed: Partial<CommandResultsByName<TCMDS>>;
    executionErrors: string[];
}

export type ResultFormattersByName<TCMDS> = { [key in keyof TCMDS]: Formatter<TCMDS[key]> }
export type FormattedResultByName<TCMDS> = { [key in keyof TCMDS]: string }

export interface FormatResults<TCMDS> {
    keys: (keyof TCMDS)[];
    formatted: Partial<FormattedResultByName<TCMDS>>;
    formatErrors: string[];
}

class FieldTracker<T> {
    public readonly errors: string[] = [];
    public readonly keys: (keyof T)[] = [];

    public add<T2>(key: keyof T, result?: DetailedResult<T2, CommandFailureDetail>): void {
        // istanbul ignore else
        if (result !== undefined) {
            if (result.isFailure()) {
                if (result.detail !== 'parse') {
                    this.errors.push(`${key}: ${result.message}`);
                }
            }
            else {
                this.keys.push(key);
            }
        }
    }

    public get failed(): boolean {
        return (this.keys.length === 0) && (this.errors.length > 0);
    }

    public getFailure<T>(message?: string): Result<T> {
        // istanbul ignore next line
        const errors = (message ? [message, ...this.errors] : this.errors);
        return fail(errors.join('\n'));
    }

    public report<T2>(value: T2): Result<T2 & { keys: (keyof T)[]}> {
        if (this.failed) {
            return fail(this.errors.join('\n'));
        }
        return succeed({ keys: this.keys, ...value });
    }
}

export class CommandProcessor<TCMDS, TCTX> {
    public readonly commands: CommandsByName<TCMDS, TCTX>;
    public readonly displayOrder: (keyof TCMDS)[];
    private readonly _evalOrder: (keyof TCMDS)[];

    public constructor(commands: CommandsByName<TCMDS, TCTX>, evalOrder?: (keyof TCMDS)[], displayOrder?: (keyof TCMDS)[]) {
        this.commands = commands;

        this._evalOrder = CommandProcessor._validateOrder('evaluation order', commands, evalOrder).getValueOrThrow();
        this.displayOrder = ((displayOrder === undefined) || (displayOrder.length === 0))
            ? this._evalOrder
            : CommandProcessor._validateOrder('display order', commands, displayOrder).getValueOrThrow();
    }

    protected static _validateOrder<TCMDS, TCTX>(description: string, commands: CommandsByName<TCMDS, TCTX>, order?: (keyof TCMDS)[]): Result<(keyof TCMDS)[]> {
        if ((order !== undefined) && (order.length > 0)) {
            for (const key of order) {
                if (commands[key] === undefined) {
                    return fail(`Key ${key} is present in ${description} but not in commands.`);
                }
            }

            for (const key in commands) {
                if (!order.includes(key)) {
                    return fail(`Command ${key} is present in commands but not in ${description}`);
                }
            }
        }
        else {
            order = [];
            for (const key in commands) {
                // istanbul ignore else
                if (commands[key] !== undefined) {
                    order.push(key);
                }
            }
        }
        return succeed(order);
    }

    public preprocessOne(command: string, context: TCTX): Result<Partial<PreprocessedCommandsByName<TCMDS>>[keyof TCMDS]> {
        const preprocessResult = this.preprocessAll(command, context);
        if (preprocessResult.isFailure()) {
            return fail(preprocessResult.message);
        }

        const { keys, preprocessed } = preprocessResult.value;

        if (keys.length < 1) {
            return fail(`No command matched ${command}`);
        }
        else if (keys.length > 1) {
            // istanbul ignore next
            const candidates = keys.map((k) => preprocessed[k]?.name).join(', ');
            return fail(`Ambiguous command ${command} could be any of: [${candidates}]`);
        }
        return succeed(preprocessed[keys[0]]);
    }

    public preprocessAll(command: string, context: TCTX): Result<PreprocessResults<TCMDS>> {
        const tracker = new FieldTracker<TCMDS>();
        const preprocessed: Partial<PreprocessedCommandsByName<TCMDS>> = {};

        for (const key of this._evalOrder) {
            // the optional chained calls are hard to test
            // istanbul ignore next
            tracker.add(key, this.commands[key]?.preprocess(command, context)?.onSuccess((value) => {
                if (value !== undefined) {
                    preprocessed[key] = value;
                }
                return succeedWithDetail(value);
            }));
        }

        return tracker.report({ preprocessed, preprocessErrors: tracker.errors });
    }

    public executeAll(command: string, context: TCTX): Result<ExecuteResults<TCMDS>> {
        const preprocessResult = this.preprocessAll(command, context);
        if (preprocessResult.isFailure()) {
            return fail(preprocessResult.message);
        }

        const { keys, preprocessed } = preprocessResult.value;
        const tracker = new FieldTracker<TCMDS>();
        const executed: Partial<CommandResultsByName<TCMDS>> = {};

        for (const key of keys) {
            const cmd = preprocessed[key];
            // istanbul ignore else
            if (cmd !== undefined) {
                const executeResult = cmd.execute();
                tracker.add(key, executeResult);
                if (executeResult.isSuccess()) {
                    executed[key] = executeResult;
                }
            }
        }

        return tracker.report({ executed, executionErrors: tracker.errors });
    }

    public executeFirst(command: string, context: TCTX): Result<ExecuteResults<TCMDS>> {
        const preprocessResult = this.preprocessAll(command, context);
        if (preprocessResult.isFailure()) {
            return fail(preprocessResult.message);
        }

        const { keys, preprocessed } = preprocessResult.value;
        const tracker = new FieldTracker<TCMDS>();
        const executed: Partial<CommandResultsByName<TCMDS>> = {};

        for (const key of keys) {
            const command = preprocessed[key];
            // istanbul ignore else
            if (command !== undefined) {
                const executeResult = command.execute();
                tracker.add(key, executeResult);

                if (executeResult.isSuccess()) {
                    executed[key] = executeResult;
                }

                if (tracker.keys.length === 1) {
                    return tracker.report({ executed, executionErrors: tracker.errors });
                }
            }
        }

        return tracker.getFailure(`No command matched "${command}"`);
    }

    public executeOne(command: string, context: TCTX): Result<ExecuteResults<TCMDS>> {
        return this.preprocessOne(command, context).onSuccess((command) => {
            // istanbul ignore else
            if (command !== undefined) {
                const executeResult = command.execute();

                // should never happen in real life and a pain to induce
                // istanbul ignore else
                if (executeResult !== undefined) {
                    if (executeResult.isSuccess()) {
                        const executed: Partial<CommandResultsByName<TCMDS>> = {};
                        executed[command.name] = executeResult;
                        return succeed<ExecuteResults<TCMDS>>({
                            keys: [command.name],
                            executed,
                            executionErrors: [],
                        });
                    }
                    return fail(executeResult.message);
                }
            }

            // should never happen in real life and a pain to induce
            // istanbul ignore next
            return fail(`Unknown execution failure for ${command}`);
        });
    }

    public formatAll(
        executedResult: ExecuteResults<TCMDS>,
        formatters: Partial<ResultFormattersByName<TCMDS>>,
    ): Result<FormatResults<TCMDS>> {
        const { keys, executed } = executedResult;
        const tracker = new FieldTracker<TCMDS>();
        const formatted: Partial<FormattedResultByName<TCMDS>> = {};

        for (const key of keys) {
            const commandResult = executed[key];
            // istanbul ignore else
            if (commandResult !== undefined) {
                const formatter = formatters[key];
                if (formatter !== undefined) {
                    const formatResult = propagateCommandResult(
                        formatter(commandResult.format, commandResult.value),
                        key,
                        commandResult.format,
                        'format',
                    );
                    tracker.add(key, formatResult);
                    if (formatResult.isSuccess()) {
                        formatted[key] = formatResult.value;
                    }
                }
                else {
                    tracker.add(key, failWithDetail(`Command ${key} has results but no formatter.`, 'format'));
                }
            }
        }

        return tracker.report({ formatted, formatErrors: tracker.errors });
    }

    public format(
        key: keyof TCMDS,
        executedResult: ExecuteResults<TCMDS>,
        formatters: Partial<ResultFormattersByName<TCMDS>>,
    ): Result<string> {
        const commandResult = executedResult.executed[key];
        const formatter = formatters[key];
        if ((!executedResult.keys.includes(key)) || (commandResult === undefined)) {
            return fail(`CommandProcessor.format: No result for ${key}`);
        }

        if (formatter === undefined) {
            return fail(`CommandProcessor.format: no formatter for ${key}`);
        }

        return formatter(commandResult.format, commandResult.value);
    }

    public get numCommands(): number {
        return this._evalOrder.length;
    }

    public getHelp(): string[] {
        const lines: string[] = [];
        for (const key of this.displayOrder) {
            lines.push(...this.commands[key].help.getHelpText());
        }
        return lines;
    }

    public getDefaultFormatters(target: FormatTargets, keys?: (keyof TCMDS)[]): Result<Partial<ResultFormattersByName<TCMDS>>> {
        keys = keys ?? this.displayOrder;
        const formatters: Partial<ResultFormattersByName<TCMDS>> = {};
        for (const key of keys) {
            formatters[key] = this.commands[key].getDefaultFormatter(target).getValueOrDefault();
        }
        return succeed(formatters);
    }
}

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

import { CommandResult, Commands, PreProcessedCommand, PreProcessedCommandBase, ValidatedCommands } from './command';
import {
    FormatTargets,
    Formatter,
    Result,
    fail,
    succeed,
} from '@fgv/ts-utils';

export type ExecutedResult<TCMDS> = { [key in keyof TCMDS]: CommandResult<keyof TCMDS, TCMDS[key]> }

export interface ValidatedCommandsResult<TCMDS> {
    keys: (keyof TCMDS)[];
    validated: Partial<ValidatedCommands<TCMDS>>;
    validationErrors: string[];
}

export interface ExecutedCommandsResult<TCMDS> {
    keys: (keyof TCMDS)[];
    executed: Partial<ExecutedResult<TCMDS>>;
}

export type ResultFormatters<TCMDS> = { [key in keyof TCMDS]: Formatter<TCMDS[key]> }
export type FormattedResult<TCMDS> = { [key in keyof TCMDS]: string }

export interface FormattedCommandsResult<TCMDS> {
    keys: (keyof TCMDS)[];
    formatted: Partial<FormattedResult<TCMDS>>;
}

class FieldTracker<T> {
    public readonly errors: string[] = [];
    public readonly keys: (keyof T)[] = [];

    public add<T2>(key: keyof T, result?: Result<T2>): void {
        // istanbul ignore else
        if (result !== undefined) {
            if (result.isFailure()) {
                this.errors.push(result.message);
            }
            else if (result.value !== undefined) {
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

export class CommandProcessor<TCMDS> {
    public readonly commands: Commands<TCMDS>;
    public readonly displayOrder: (keyof TCMDS)[];
    private readonly _evalOrder: (keyof TCMDS)[];

    public constructor(commands: Commands<TCMDS>, evalOrder?: (keyof TCMDS)[], displayOrder?: (keyof TCMDS)[]) {
        this.commands = commands;

        this._evalOrder = CommandProcessor._validateOrder('evaluation order', commands, evalOrder).getValueOrThrow();
        this.displayOrder = ((displayOrder === undefined) || (displayOrder.length === 0))
            ? this._evalOrder
            : CommandProcessor._validateOrder('display order', commands, displayOrder).getValueOrThrow();
    }

    protected static _validateOrder<TCMDS>(description: string, commands: Commands<TCMDS>, order?: (keyof TCMDS)[]): Result<(keyof TCMDS)[]> {
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

    public validateOne(command: string): Result<Partial<ValidatedCommands<TCMDS>>[keyof TCMDS]> {
        const validateResult = this.validateAll(command);
        if (validateResult.isFailure()) {
            return fail(validateResult.message);
        }

        const { keys, validated } = validateResult.value;

        if (keys.length < 1) {
            return fail(`No command matched ${command}`);
        }
        else if (keys.length > 1) {
            // istanbul ignore next
            const candidates = keys.map((k) => validated[k]?.command).join(', ');
            return fail(`Ambiguous command ${command} could be any of: [${candidates}]`);
        }
        return succeed(validated[keys[0]]);
    }

    public validateAll(command: string): Result<ValidatedCommandsResult<TCMDS>> {
        const tracker = new FieldTracker<TCMDS>();
        const validated: Partial<ValidatedCommands<TCMDS>> = {};

        for (const key of this._evalOrder) {
            // the optional chained calls are hard to test
            // istanbul ignore next
            tracker.add(key, this.commands[key]?.validate(command)?.onSuccess((value) => {
                if (value !== undefined) {
                    validated[key] = value;
                }
                return succeed(value);
            }));
        }

        return tracker.report({ validated, validationErrors: tracker.errors });
    }

    public processAll(command: string): Result<ExecutedCommandsResult<TCMDS>> {
        const validateResult = this.validateAll(command);
        if (validateResult.isFailure()) {
            return fail(validateResult.message);
        }

        const { keys, validated } = validateResult.value;
        const tracker = new FieldTracker<TCMDS>();
        const executed: Partial<ExecutedResult<TCMDS>> = {};

        for (const key of keys) {
            // hard and kind of pointless to create unit tests for the optional
            // chained call here
            // istanbul ignore next
            tracker.add(key, validated[key]?.execute()?.onSuccess((value) => {
                executed[key] = value;
                return succeed(value);
            }));
        }

        return tracker.report({ executed });
    }

    public processFirst(command: string): Result<ExecutedCommandsResult<TCMDS>> {
        const validateResult = this.validateAll(command);
        if (validateResult.isFailure()) {
            return fail(validateResult.message);
        }

        const { keys, validated } = validateResult.value;
        const tracker = new FieldTracker<TCMDS>();
        const executed: Partial<ExecutedResult<TCMDS>> = {};

        for (const key of keys) {
            const validator = validated[key];
            // istanbul ignore else
            if (validator !== undefined) {
                tracker.add(key, validator.execute().onSuccess((value) => {
                    executed[key] = value;
                    return succeed(value);
                }));

                if (tracker.keys.length === 1) {
                    return tracker.report({ executed });
                }
            }
        }

        return tracker.getFailure(`No command matched "${command}"`);
    }

    public processOne(command: string): Result<ExecutedCommandsResult<TCMDS>> {
        return this.validateOne(command).onSuccess((validated) => {
            // istanbul ignore else
            if (validated !== undefined) {
                const executeResult = validated.execute();

                // should never happen in real life and a pain to induce
                // istanbul ignore else
                if (executeResult !== undefined) {
                    if (executeResult.isSuccess()) {
                        const executed: Partial<ExecutedResult<TCMDS>> = {};
                        executed[validated.command] = executeResult.value;
                        return succeed<ExecutedCommandsResult<TCMDS>>({ keys: [validated.command], executed });
                    }
                    return fail(executeResult.message);
                }
            }

            // should never happen in real life and a pain to induce
            // istanbul ignore next
            return fail(`Unknown execution failure for ${command}`);
        });
    }

    public preProcessOne(command: string, formatters: Partial<ResultFormatters<TCMDS>>): Result<PreProcessedCommand|undefined> {
        return this.validateOne(command).onSuccess((validated) => {
            // istanbul ignore else
            if (validated !== undefined) {
                return PreProcessedCommandBase.create(validated, formatters[validated.command]);
            }
            else {
                return succeed(undefined);
            }
        });
    }

    public formatAll(
        executedResult: ExecutedCommandsResult<TCMDS>,
        formatters: Partial<ResultFormatters<TCMDS>>,
    ): Result<FormattedCommandsResult<TCMDS>> {
        const { keys, executed } = executedResult;
        const tracker = new FieldTracker<TCMDS>();
        const formatted: Partial<FormattedResult<TCMDS>> = {};

        for (const key of keys) {
            const result = executed[key];
            const formatter = formatters[key];
            // istanbul ignore else
            if ((result !== undefined) && (formatter !== undefined)) {
                tracker.add(key, formatter(result.message, result.result).onSuccess((message: string) => {
                    formatted[key] = message;
                    return succeed(message);
                }));
            }
        }

        return tracker.report({ formatted });
    }

    public format(
        key: keyof TCMDS,
        executedResult: ExecutedCommandsResult<TCMDS>,
        formatters: Partial<ResultFormatters<TCMDS>>,
    ): Result<string> {
        const result = executedResult.executed[key];
        const formatter = formatters[key];
        if ((!executedResult.keys.includes(key)) || (result === undefined)) {
            return fail(`CommandProcessor.format: No result for ${key}`);
        }

        if (formatter === undefined) {
            return fail(`CommandProcessor.format: no formatter for ${key}`);
        }

        return formatter(result.message, result.result);
    }

    public get numCommands(): number {
        return this._evalOrder.length;
    }

    public getHelp(): string[] {
        const lines: string[] = [];
        for (const key of this.displayOrder) {
            lines.push(...this.commands[key].getHelpLines());
        }
        return lines;
    }

    public getDefaultFormatters(target: FormatTargets, keys?: (keyof TCMDS)[]): Result<Partial<ResultFormatters<TCMDS>>> {
        keys = keys ?? this.displayOrder;
        const formatters: Partial<ResultFormatters<TCMDS>> = {};
        for (const key of keys) {
            formatters[key] = this.commands[key].getDefaultFormatter(target).getValueOrDefault();
        }
        return succeed(formatters);
    }
}

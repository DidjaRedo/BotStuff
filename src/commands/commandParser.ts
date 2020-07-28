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

import { Result, captureResult, fail, succeed } from '@fgv/ts-utils';

export interface CommandFragment {
    value: string;
    optional?: boolean;
    hasEmbeddedCapture?: boolean;
}

export interface CommandProperty<T> extends CommandFragment {
    name?: keyof T;
}

export type CommandProperties<T> = { [ key in keyof T]: CommandFragment };
export type ParsedCommand<T> = Partial<Record<keyof T, string>>;

export class CommandParser<T> {
    public readonly regexp: RegExp;
    public readonly captures: (keyof T)[];

    public constructor(regexp: RegExp, captures: (keyof T)[]) {
        this.regexp = regexp;
        this.captures = captures;
    }

    public parse(source: string): Result<ParsedCommand<T>|undefined> {
        const match = this.regexp.exec(source);
        if (match === null) {
            return succeed(undefined);
        }

        match.shift(); // skip the full string
        if (match.length !== (this.captures.length)) {
            return fail(`Mismatched capture count: got ${match.length}, expected ${this.captures.length}`);
        }

        const result: ParsedCommand<T> = {};
        for (const key of this.captures) {
            result[key] = match.shift()?.trim();
        }
        return succeed(result);
    }
}

export class ParserBuilder<T> {
    protected _fields: CommandProperties<T>;
    public constructor(fields: CommandProperties<T>) {
        this._fields = fields;
    }

    public build(command: string|string[]): Result<CommandParser<T>> {
        command = (typeof command === 'string') ? command.split(/\s/) : command;

        const captures: (keyof T)[] = [];
        let addSeparator = false;
        let str = '^\\s*';
        for (const part of command) {
            const fieldResult = this._getFragment(part);
            if (fieldResult.isFailure()) {
                return fail(fieldResult.message);
            }

            const field = fieldResult.value;
            const separator = addSeparator ? '\\s+' : '';
            const isOptional = (field.optional === true);
            const addCapture = ((field.name !== undefined) && (field.hasEmbeddedCapture !== true));

            if (isOptional) {
                if (addCapture) {
                    str += `(?:${separator}(${field.value}))?`;
                }
                else {
                    str += `(?:${separator}${field.value})?`;
                }
            }
            else if (addCapture) {
                str += `${separator}(${field.value})`;
            }
            else {
                str += `${separator}${field.value}`;
            }

            addSeparator = true;
            if (field.name !== undefined) {
                captures.push(field.name);
            }
        }
        str += '\\s*$';
        return captureResult(() => new CommandParser(new RegExp(str), captures));
    }

    private _isField(part: string|number|symbol): part is keyof T {
        return this._fields.hasOwnProperty(part);
    }

    private _getFragment(part: string): Result<CommandProperty<T>> {
        if (part.startsWith('{{') && part.endsWith('}}')) {
            part = part.slice(2, -2);

            const forceOptional = part.endsWith('?');
            if (forceOptional) {
                part = part.slice(0, -1);
            }

            if (this._isField(part)) {
                const fragment: CommandProperty<T> = {
                    ...this._fields[part],
                    name: part,
                };
                if (forceOptional) {
                    fragment.optional = forceOptional;
                }
                return succeed(fragment);
            }
            return fail(`Unrecognized property ${part}`);
        }

        return succeed({
            name: undefined,
            value: part,
            optional: false,
        });
    }
}

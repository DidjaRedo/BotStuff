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

import { Utils } from '../utils/utils';

export interface RegExpFragment {
    value: string;
    optional?: boolean;
    hasEmbeddedCapture?: boolean;
}

export interface RegExpProperty<T> extends RegExpFragment {
    name?: keyof T;
}

export type RegExpProperties<T> = { [ key in keyof T]: RegExpFragment };

export interface RegExpField extends RegExpFragment {
    name: string;
}

export class RegExpBuilder {
    private _fields: Map<string, RegExpFragment>;

    public constructor(fragments: Iterable<RegExpField>) {
        this._fields = new Map(Utils.select(fragments, (source: RegExpField): [string, RegExpFragment] => {
            return [source.name, { value: source.value, optional: (source.optional ? true : false) }];
        }));

        if (this._fields.size < 1) {
            throw new Error('RegExpBuilder needs at least one fragment.');
        }
    }

    public buildString(fields: string[]|string): string {
        if (typeof fields === 'string') {
            fields = fields.split(/\s/);
        }

        let separator: string|undefined = undefined;
        let str = '^\\s*';

        fields.forEach((raw: string): void => {
            if (separator) {
                str += separator;
                separator = undefined;
            }

            const field = this._getField(raw);
            if (field.optional) {
                str += `(?:(?:${field.value})\\s+)?`;
            }
            else {
                str += field.value;
                separator = '\\s+';
            }
        });
        str += '\\s*$';
        return str;
    }

    public build(fields: string[]|string): RegExp {
        return new RegExp(this.buildString(fields));
    }

    private _getField(field: string): RegExpFragment {
        const key = field.toLowerCase();
        let fragment = this._fields.get(key);
        if (!fragment) {
            fragment = {
                value: field,
                optional: false,
            };
        }
        return fragment;
    }
}

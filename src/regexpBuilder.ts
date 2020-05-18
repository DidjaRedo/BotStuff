'use strict';

import { Utils } from './utils';

export interface RegExpFragment {
    value: string;
    optional?: boolean;
}

export interface RegExpField extends RegExpFragment {
    name: string;
}

export class RegExpBuilder {
    public constructor(fragments: Iterable<RegExpField>) {
        this._fields = new Map(Utils.select(fragments, (source: RegExpField): [string, RegExpFragment] => {
            return [source.name, { value: source.value, optional: (source.optional ? true : false) }];
        }));

        if (this._fields.size < 1) {
            throw new Error('RegExpBuilder needs at least one fragment.');
        }
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

    public buildString(fields: string[]|string): string {
        if (typeof fields === 'string') {
            fields = fields.split(/\s/);
        }

        let separator = undefined;
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

    private _fields: Map<string, RegExpFragment>;
};

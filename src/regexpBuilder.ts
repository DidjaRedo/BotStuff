"use strict";

import { Utils } from "./utils";

export interface RegexpFragment {
    value: string;
    optional?: boolean;
}

export interface RegexpField extends RegexpFragment {
    name: string;
}

export class RegexpBuilder {
    public constructor(fragments: Iterable<RegexpField>) {
        this._fields = new Map(Utils.select(fragments, (source: RegexpField): [string, RegexpFragment] => {
            return [source.name, { value: source.value, optional: (source.optional ? true : false) }];
        }));
    }

    private _getField(field: string): RegexpFragment {
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

    public buildString(fields: string[]): string {
        let separator = undefined;
        let str = "^";

        fields.forEach((raw: string): void => {
            if (separator) {
                str += separator;
                separator = undefined;
            }

            let field = this._getField(raw);
            if (field.optional) {
                str += `(?:(?:${field.value})\\s+)?`; 
            }
            else {
                str += field.value;
                separator = "\\s+";
            }
        });
        str += "\\s*$";
        return str;
    }

    public build(fields: string[]): RegExp {
        return new RegExp(this.buildString(fields));
    }

    private _fields: Map<string, RegexpFragment>;
};

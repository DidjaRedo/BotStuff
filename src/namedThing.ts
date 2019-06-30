"use strict";

import { Names, Normalizable } from "./names";

export class NamedThing<T extends object> {
    public constructor(name: string, properties: Normalizable<T>) {
        if (name.trim().length < 1) {
            throw new Error('Invalid name for NamedThing - "${name}" must contain at least one non-whitespace character.');
        }

        this._name = name;
        this._key = Names.normalizeString(name);
        this._properties = properties.properties;
        this._normalized = properties.normalize();
    };

    private _name: string;
    private _key: string;
    private _properties: T;
    private _normalized: T;

    public get name(): string { return this._name; }
    public get key(): string { return this._key; }
    public get properties(): T { return this._properties; }
    public get normalized(): T { return this._normalized; }
};

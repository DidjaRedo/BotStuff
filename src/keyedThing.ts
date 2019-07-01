"use strict";

import { NamedThing, Normalizable } from "./names";
import { Utils } from "./utils";

export class KeyedThing<T extends TN, TN extends NamedThing> implements Normalizable<T, TN> {
    public constructor(thing: Normalizable<T, TN>) {
        if ((!thing.properties.name) || (thing.properties.name.trim().length < 1)) {
            throw new Error('Invalid name for NamedThing - "${name}" must contain at least one non-whitespace character.');
        }

        this._thing = thing;
    }

    private _thing: Normalizable<T, TN>;

    public get key(): string { return this._thing.normalized.name; }
    public get name(): string { return this._thing.properties.name; }
    public get properties(): T { return this._thing.properties; }
    public get normalized(): TN { return this._thing.normalized; }

    public static init<T extends TN, TN extends NamedThing>(things: Iterable<T>, init: {(thing: T): KeyedThing<T, TN>}): KeyedThing<T, TN>[] {
        return Utils.select(things, init);
    }
}

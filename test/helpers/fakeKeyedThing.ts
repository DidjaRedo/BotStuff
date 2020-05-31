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
import { Directory, DirectoryLookupOptions } from '../../src/names/directory';
import { KeyedThing } from '../../src/names/keyedThing';
import { Names } from '../../src/names/names';

export interface FakeKeys {
    name: string;
    alternateName?: string;
    aliases?: string[];
    city: string;
    state: string;
}

export interface FakeProps extends FakeKeys {
    name: string;
    alternateName?: string;
    aliases?: string[];
    city: string;
    state: string;
    isSpecial?: boolean;
    externalId?: string;
};

export class FakeKeyedThing implements FakeProps, KeyedThing<FakeKeys> {
    public readonly name: string;
    public readonly alternateName?: string;
    public readonly aliases: string[];
    public readonly city: string;
    public readonly state: string;
    public readonly isSpecial: boolean;
    public readonly externalId?: string;
    public readonly keys: FakeKeys;
    public get primaryKey(): string { return this.keys.name; }

    public constructor(init: FakeProps) {
        this.name = init.name;
        this.alternateName = init.alternateName;
        this.aliases = init.aliases ?? [];
        this.city = init.city;
        this.state = init.state;
        this.isSpecial = (init.isSpecial === true);
        this.externalId = init.externalId;
        this.keys = {
            name: Names.normalizeOrThrow(init.name),
            alternateName: Names.normalizeOrThrow(init.alternateName),
            aliases: Names.normalizeOrThrow(init.aliases ?? []),
            city: Names.normalizeOrThrow(init.city),
            state: Names.normalizeOrThrow(init.state),
        };
    }
}

export class FakeKtDirectory extends Directory<FakeKeyedThing, FakeProps, FakeKeys> {
    constructor(
        options: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys>,
        elements?: Iterable<FakeKeyedThing>) {
        super(options, elements);
    }
}

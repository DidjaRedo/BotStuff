import { Names } from '../../src/names';
import { KeyedThing } from '../../src/keyedThing';

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
            name: Names.normalizeString(init.name),
            alternateName: Names.normalizeString(init.alternateName),
            aliases: Names.normalizeStrings(init.aliases ?? []),
            city: Names.normalizeString(init.city),
            state: Names.normalizeString(init.state),
        };
    }
}

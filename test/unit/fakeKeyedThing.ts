"use strict";

import { Names } from "../../src/names";
import { KeyedThing } from "../../src/keyedThing";

export interface FakeProps extends FakeNormalizedProps {
    name: string;
    alternateName?: string;
    aliases?: string[];
    city: string;
    state: string;
    isSpecial?: boolean;
    externalId?: string;
};

export interface FakeNormalizedProps {
    name: string;
    alternateName?: string;
    aliases?: string[];
    city: string;
    state: string;
}

export class FakeInit {
    private constructor() {}

    public static toInit(props: FakeProps): KeyedThing<FakeProps, FakeNormalizedProps> {
        const normalized: FakeNormalizedProps = {
            name: Names.tryNormalizeString(props.name),
            city: Names.tryNormalizeString(props.city),
            state: Names.tryNormalizeString(props.state),
        };
        if (props.alternateName) {
            normalized.alternateName = Names.tryNormalizeString(props.alternateName);
        }
        if (props.aliases) {
            normalized.aliases = Names.tryNormalizeStrings(props.aliases);
        }

        return new KeyedThing({
            properties: props,
            normalized: normalized,
        });
    }
}

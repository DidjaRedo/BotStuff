"use strict";

import { Names, Normalizable } from "../../src/names";
import { NamedThing } from "../../src/namedThing";

describe("NamedThing class", (): void => {
    interface FakeProps {
        firstProp: string;
        secondProp: string;
    };

    class FakeInitializer implements Normalizable<FakeProps> {
        public constructor(props: FakeProps) {
            this._props = props;
        }

        private _props: FakeProps;

        public get properties(): FakeProps {
            return this._props;
        }

        public normalize(): FakeProps {
            return {
                firstProp: Names.normalizeString(this._props.firstProp),
                secondProp: Names.normalizeString(this._props.secondProp),
            };
        }
    }

    const fake: FakeProps = {
        firstProp: "FIRST PROP",
        secondProp: "Second Prop",
    };

    describe("constructor", (): void => {
        it("should initialize with supplied properties", (): void => {
            const name = "Named Thing";
            const thing = new NamedThing(name, new FakeInitializer(fake));
            expect(thing.name).toBe(name);
            expect(thing.key).toBe(Names.normalizeString(name));
            expect(thing.properties.firstProp).toBe(fake.firstProp);
            expect(thing.properties.secondProp).toBe(fake.secondProp);
            expect(thing.normalized.firstProp).toBe(Names.normalizeString(fake.firstProp));
            expect(thing.normalized.secondProp).toBe(Names.normalizeString(fake.secondProp));
        });

        it("should throw if the name is whitespace", (): void => {
            expect((): NamedThing<FakeProps> => new NamedThing("   ", new FakeInitializer(fake))).toThrowError(/whitespace/i);
        });
    });
});

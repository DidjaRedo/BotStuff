'use strict';

import { Names, Normalizable } from '../../src/names';
import { KeyedThing } from '../../src/keyedThing';

describe('KeyedThing class', (): void => {
    interface FakeProps {
        name: string;
        firstProp: string;
        secondProp: string;
        notNormalizedProp: string;
    };

    interface FakeNormalizedProps {
        name: string;
        firstProp: string;
        secondProp: string;
    }

    class FakeInitializer implements Normalizable<FakeProps, FakeNormalizedProps> {
        public constructor(props: FakeProps) {
            const bogusName = ((!props.name) || (props.name.trim().length < 1));
            this._props = props;
            this._normalized = {
                name: bogusName ? props.name : Names.normalizeString(props.name),
                firstProp: Names.normalizeString(props.firstProp),
                secondProp: Names.normalizeString(props.secondProp),
            };
        }

        private _props: FakeProps;
        private _normalized: FakeNormalizedProps;

        public get properties(): FakeProps {
            return this._props;
        }

        public get normalized(): FakeNormalizedProps {
            return this._normalized;
        }
    }

    const fake: FakeProps = {
        name: 'Named Thing',
        firstProp: 'FIRST PROP',
        secondProp: 'Second Prop',
        notNormalizedProp: 'This is NOT the property you are looking for',
    };

    const badFake: FakeProps = {
        name: '  ',
        firstProp: 'FIRST PROP',
        secondProp: 'Second Prop',
        notNormalizedProp: 'This is NOT the property you are looking for',
    };

    describe('constructor', (): void => {
        it('should initialize with supplied properties', (): void => {
            const thing = new KeyedThing(new FakeInitializer(fake));
            expect(thing.name).toBe(fake.name);
            expect(thing.key).toBe(Names.normalizeString(fake.name));
            expect(thing.properties.firstProp).toBe(fake.firstProp);
            expect(thing.properties.secondProp).toBe(fake.secondProp);
            expect(thing.properties.notNormalizedProp).toBe(fake.notNormalizedProp);
            expect(thing.normalized.firstProp).toBe(Names.normalizeString(fake.firstProp));
            expect(thing.normalized.secondProp).toBe(Names.normalizeString(fake.secondProp));
        });

        it('should throw if the name is whitespace', (): void => {
            expect((): KeyedThing<FakeProps, FakeNormalizedProps> => new KeyedThing(new FakeInitializer(badFake))).toThrowError(/whitespace/i);
        });
    });
});

import { Names } from '../../src/names';
import { NormalizedMap } from '../../src/normalizedMap';

describe('NormalizedMap class', (): void => {
    interface BogusObject {
        name: string;
        normalizedName: string;
        value: object;
    };

    function bogusInit(name: string, normalizedName: string, value: object): object {
        return {
            name: name,
            normalizedName: normalizedName,
            value: value,
        };
    }

    function bogusUpdate(existing: object, __: string, value: object): object {
        (existing as BogusObject).value = value;
        return existing;
    }

    describe('constructor', (): void => {
        it('should construct an empty map', (): void => {
            const map = new NormalizedMap(bogusInit, bogusUpdate);
            expect(map.size).toBe(0);
        });
    });

    describe('addOrUpdate method', (): void => {
        it('should add a new element to the map', (): void => {
            const map = new NormalizedMap();
            const n1 = 'FIRST ELEMENT';
            const p1 = { content: 'FIRST PAYLOAD' };

            const elem = map.addOrUpdate(n1, p1);
            expect(map.size).toBe(1);
            expect(elem).toBe(p1);
        });

        it('should update an existing element in the map using normalized names', (): void => {
            const map = new NormalizedMap();
            const n1 = 'FIRST ELEMENT';
            const nn1 = Names.normalizeString(n1);
            const p1 = { content: 'FIRST PAYLOAD' };
            const p2 = { content: 'Second Payload' };

            let elem = map.addOrUpdate(n1, p1);
            expect(map.size).toBe(1);
            expect(elem).toBe(p1);
            expect(map.tryGetElement(n1)).toBe(p1);

            elem = map.addOrUpdate(nn1, p2);
            expect(map.size).toBe(1);
            expect(elem).toBe(p2);
            expect(map.tryGetElement(n1)).toBe(p2);
        });

        it('should use the initializer to add an element to the map', (): void => {
            const map = new NormalizedMap(bogusInit, bogusUpdate);
            const n1 = 'FIRST ELEMENT';
            const n2 = 'Second Element';
            const nn1 = Names.normalizeString(n1);
            const nn2 = Names.normalizeString(n2);
            const p1 = { content: 'FIRST PAYLOAD' };
            const p2 = { content: 'Second Payload' };

            expect(map.addOrUpdate(n1, p1) as BogusObject).toBeDefined();
            expect(map.size).toBe(1);
            let elem = map.tryGetElement(n1) as BogusObject;
            expect(elem.name).toBe(n1);
            expect(elem.normalizedName).toBe(nn1);
            expect(elem.value).toBe(p1);

            expect(map.addOrUpdate(n2, p2) as BogusObject).toBeDefined();
            expect(map.size).toBe(2);
            elem = map.tryGetElement(n2) as BogusObject;
            expect(elem.name).toBe(n2);
            expect(elem.normalizedName).toBe(nn2);
            expect(elem.value).toBe(p2);
        });

        it('should use the updater to replace an element in the map', (): void => {
            const map = new NormalizedMap(bogusInit, bogusUpdate);
            const n1 = 'FIRST ELEMENT';
            const nn1 = Names.normalizeString(n1);
            const p1 = { content: 'FIRST PAYLOAD' };
            const p2 = { content: 'Second Payload' };
            const p3 = { content: 'thirD payloaD' };

            // BogusUpdate replaces the value of the existing element
            const firstElem = map.addOrUpdate(n1, p1) as BogusObject;
            expect(map.size).toBe(1);
            expect(firstElem.value).toBe(p1);

            const secondElem = map.addOrUpdate(n1, p2) as BogusObject;
            expect(map.size).toBe(1);
            expect(secondElem).toBe(firstElem);
            expect(firstElem.value).toBe(p2);

            const thirdElem = map.addOrUpdate(nn1, p3) as BogusObject;
            expect(map.size).toBe(1);
            expect(thirdElem).toBe(firstElem);
            expect(firstElem.value).toBe(p3);
        });
    });

    describe('lookupElements method', (): void => {
        it('should return both found and unknown elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const n2 = 'Some Other Element';
            const nn2 = Names.normalizeString(n2);
            const payload = { contents: 'whatever' };


            map.addOrUpdate(n1, payload);
            const lookup = map.lookupElements([n1, n2]);
            expect(lookup.found).toEqual([payload]);
            expect(lookup.unknown).toEqual([nn2]);
        });

        it('should return each found element only once', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const nn1 = Names.normalizeString(n1);
            const payload = { contents: 'whatever' };


            map.addOrUpdate(n1, payload);
            const lookup = map.lookupElements([n1, nn1]);
            expect(lookup.found).toEqual([payload]);
        });

        it('should return unique normalized names for unknown elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            const lookupKeys = ['Some other element', 'Another element', n1, 'someotherelemENT'];
            const expectedUnknown = ['someotherelement', 'anotherelement'];

            map.addOrUpdate(n1, payload);
            const lookup = map.lookupElements(lookupKeys);
            expect(lookup.found).toEqual([payload]);
            expect(lookup.unknown).toEqual(expectedUnknown);
        });
    });

    describe('getElements method', (): void => {
        it('should return found elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            map.addOrUpdate(n1, payload);
            expect(map.getElements([n1])).toEqual([payload]);
        });

        it('should throw if any elements are unknown', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            map.addOrUpdate(n1, payload);
            expect((): void => { map.getElements(['some other string']); }).toThrowError(/unknown/i);
        });
    });

    describe('tryGetElements method', (): void => {
        it('should return found elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            map.addOrUpdate(n1, payload);
            expect(map.tryGetElements([n1])).toEqual([payload]);
        });

        it('should ignore unknown elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            map.addOrUpdate(n1, payload);
            expect(map.tryGetElements(['some other string'])).toEqual([]);
        });
    });

    describe('forEach method', (): void => {
        it('should enumerate all elements passing normalized key names', (): void => {
            const map = new NormalizedMap();
            const names = ['Element 1', 'second ELEMENT', 'Third Element'];
            const added = [];
            names.forEach((n: string): void => {
                added.push(map.addOrUpdate(n, { name: n }));
            });

            const found = [];
            map.forEach((e: object, n: string): void => {
                found.push(e);
                const gotName = (e as { name: string }).name;
                expect(Names.normalize(gotName)).toEqual(n);
            });

            expect(found.length).toEqual(added.length);
            found.forEach((f): void => { expect(added).toContain(f); });
            added.forEach((a): void => { expect(found).toContain(a); });
        });
    });

    describe('containsName method', (): void => {
        const map = new NormalizedMap();
        const names = ['Element 1', 'second ELEMENT', 'Third Element'];
        names.forEach((n: string): void => {
            map.addOrUpdate(n, { name: n });
        });
        map.addOrUpdate('EMPTY', null);

        it('should return true if an item with the same normalized name is present', (): void => {
            names.forEach((n: string): void => {
                expect(map.containsName(n)).toBe(true);
                expect(map.containsName(Names.normalizeString(n))).toBe(true);
            });
        });

        it('should return false if no item with the same normalized name is present', (): void => {
            expect(map.containsName('BLAH BLAH BLAH')).toBe(false);
        });

        it('should return false if the item with the same name is null or undefined', (): void => {
            expect(map.containsName('EMPTY')).toBe(false);
        });
    });

    describe('select method', (): void => {
        const map = new NormalizedMap();
        const names = ['Element 1', 'second ELEMENT', 'Third Element'];
        names.forEach((n: string): void => {
            map.addOrUpdate(n, { name: n });
        });
        map.addOrUpdate('EMPTY', null);

        it('should invoke the select method for each element', (): void => {
            let count = 0;
            map.select((value: object, key: string): object => {
                count++;
                expect(key).toEqual(Names.normalizeString(key));
                return value;
            });
            expect(count).toBe(map.size);
        });

        it('should not include elements in the return for which the select method returns undefined', (): void => {
            const selected = map.select((value: object, key: string): object => {
                if (value) {
                    expect(key).toEqual(Names.normalizeString(key));
                    return value;
                }
                return undefined;
            });
            expect(selected.length).toBe(map.size - 1);
        });

        it('should include elements in the return for which the select method returns a falsy value other than undefined', (): void => {
            const selected = map.select((value: object, key: string): object => {
                expect(key).toEqual(Names.normalizeString(key));
                return value;
            });
            expect(selected.length).toBe(map.size);
        });
    });

    describe('keys and values properties', (): void => {
        const map = new NormalizedMap();
        const names = ['Element 1', 'second ELEMENT', 'Third Element'];
        names.forEach((n: string): void => {
            map.addOrUpdate(n, { name: n });
        });

        it('should include all elements', (): void => {
            expect(map.keys.length).toEqual(names.length);
            expect(map.values.length).toEqual(names.length);
        });
    });

    describe('normalize static method', (): void => {
        it('should normalize a string', (): void => {
            expect(Names.normalize('Some String')).toBe('somestring');
        });

        it('should throw for an empty string', (): void => {
            expect((): string|string[] => Names.normalize('   ')).toThrowError('Cannot normalize an empty string.');
        });

        /*
        it("should throw for anything but string or array", (): void => {
            [
                {}, true, 11, undefined, null, (): boolean => true,
            ].forEach((badParam): void => {
                expect(() => NormalizedMap.normalize(badParam)).toThrowError(/cannot normalize an input of type/i);
            });
        });
        */

        it('should normalize all strings in an array', (): void => {
            expect(Names.normalize(['BLAH', 'Some name with spaces and punctuation!', 'this-is-a-test'])).toEqual([
                'blah', 'somenamewithspacesandpunctuation', 'thisisatest',
            ]);
        });

        it('should throw if any strings are empty', (): void => {
            expect((): string|string[] => Names.normalize(['BLAH', '    '])).toThrowError('Cannot normalize an empty string.');
        });
    });
});

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
import { Result, fail, succeed } from '../../../src/utils/result';
import { Names } from '../../../src/names/names';
import { NormalizedMap } from '../../../src/names/normalizedMap';

describe('NormalizedMap class', (): void => {
    interface BogusObject {
        name: string;
        normalizedName: string;
        payload?: string;
        next?: BogusObject;
    };

    function bogusInit(name: string, normalizedName: string): Result<BogusObject> {
        return succeed({ name, normalizedName });
    }

    function bogusUpdate(existing: BogusObject, update: BogusObject): Result<BogusObject> {
        existing.next = update;
        return succeed(existing);
    }

    describe('constructor', (): void => {
        it('should construct an empty map', (): void => {
            const map = new NormalizedMap();
            expect(map.size).toBe(0);
        });
    });

    describe('setters', () => {
        describe('set method', () => {
            it('should add a new element using normalized names', () => {
                const map = new NormalizedMap();
                const payload = { payload: 'test' };

                expect(map.set('Test', payload)).toBe(map);
                expect(map.get('TEST')).toBe(payload);
            });

            it('should replace an existing element using normalized names', () => {
                const map = new NormalizedMap();
                const payload = { payload: 'test' };
                const payload2 = { payload: 'test' };

                expect(map.set('Test', payload)).toBe(map);
                expect(map.get('TEST')).toBe(payload);

                expect(map.set('test', payload2)).toBe(map);
                expect(map.get('Test')).not.toBe(payload);
                expect(map.get('TeSt')).toBe(payload2);
            });

            it('should throw if the name is invalid', () => {
                const map = new NormalizedMap();
                expect(() => map.set('   ', 'test')).toThrowError(/cannot normalize/i);
            });
        });

        describe('setStrict method', () => {
            it('should add a new element using normalized names', () => {
                const map = new NormalizedMap();
                const payload = { payload: 'test' };

                expect(map.setStrict('Test', payload)).toBe(map);
                expect(map.get('TEST')).toBe(payload);
            });

            it('should throw if there is an existing element with a matching normalized name', () => {
                const map = new NormalizedMap();
                const payload = { payload: 'test' };
                const payload2 = { payload: 'test' };

                expect(map.set('Test', payload)).toBe(map);
                expect(map.get('TEST')).toBe(payload);

                expect(() => map.setStrict('test', payload2)).toThrowError(/already exists/i);
                expect(map.get('Test')).toBe(payload);
                expect(map.get('TeSt')).not.toBe(payload2);
            });
        });

        describe('set method with updater', (): void => {
            it('should add a new element to the map using normalized names and without an update', (): void => {
                const update = jest.fn(bogusUpdate);
                const map = new NormalizedMap<BogusObject>(update);
                const name = 'FIRST ELEMENT';
                const normalized = Names.normalizeOrThrow(name);
                const element = bogusInit(name, normalized).getValueOrDefault();

                expect(() => map.set(name, element)).not.toThrow();
                const gotElement = map.get(normalized);

                expect(update).not.toHaveBeenCalled();
                expect(map.size).toBe(1);
                expect(gotElement).toEqual(element);
            });

            it('should update an existing element in the map using normalized names', (): void => {
                const update = jest.fn(bogusUpdate);
                const map = new NormalizedMap(update);
                const name = 'FIRST ELEMENT';
                const normalized = Names.normalizeOrThrow(name);
                const element = bogusInit(name, normalized).getValueOrDefault();
                const element2 = bogusInit(normalized, normalized).getValueOrDefault();

                expect(() => map.set(name, element)).not.toThrow();
                expect(update).not.toHaveBeenCalled();
                expect(map.size).toBe(1);

                let gotElement = map.get(normalized);
                expect(gotElement).toBe(element);
                expect(map.tryGet(name)).toBe(element);
                expect(map.tryGet(normalized)).toBe(element);
                expect(element.next).toBe(undefined);

                expect(() => map.set(normalized, element2)).not.toThrow();
                expect(update).toHaveBeenCalled();
                expect(map.size).toBe(1);

                gotElement = map.get(name);
                expect(gotElement).toBe(element);
                expect(map.tryGet(name)).toBe(element);
                expect(map.tryGet(normalized)).toBe(element);
                expect(element.next).toBe(element2);
            });

            it('should propagate errors from the updater', () => {
                const map = new NormalizedMap<string>(() => {
                    return fail('intentional failure');
                });

                expect(() => map.set('test', 'TEST')).not.toThrow();
                expect(() => map.set('test', 'OTHER TEST')).toThrowError(/intentional/i);
            });
        });

        describe('getOrAdd method', () => {
            it('should add a new element using normalized names', () => {
                const map = new NormalizedMap();
                const name = 'TEST';
                const normalized = Names.normalizeOrThrow(name);
                const expected = bogusInit(name, normalized).getValueOrDefault();

                expect(map.getOrAdd(name, bogusInit).getValueOrDefault()).toEqual(expected);
                expect(map.get(normalized)).toEqual(expected);
            });

            it('should return an existing element using normalized names', () => {
                const map = new NormalizedMap();
                const name = 'TEST';
                const normalized = Names.normalizeOrThrow(name);
                const element = bogusInit(name, normalized).getValueOrDefault();
                element.payload = 'have payload';

                map.set(name, element);
                expect(map.getOrAdd(name, bogusInit).getValueOrDefault()).toBe(element);
            });
        });
    });

    describe('getters', () => {
        const map = new NormalizedMap();
        const names = ['NAME', 'Other NAME', 'Name_3'];
        names.forEach((n) => map.set(n, { originalName: n }));

        describe('getStrict() method', () => {
            it('should return an element that exists using normalized lookup', () => {
                expect.assertions(names.length * 4);
                for (const name of names) {
                    let got;
                    expect(() => { got = map.getStrict(name); }).not.toThrow();
                    expect(got.originalName).toBe(name);

                    expect(() => { got = map.getStrict(` ${name.toUpperCase()} `); }).not.toThrow();
                    expect(got.originalName).toBe(name);
                }
            });

            it('should throw for a name that does not exist', () => {
                const badNames = ['name_', '0therName', 'name3'];
                expect.assertions(badNames.length);
                badNames.forEach((n) => {
                    expect(() => { map.getStrict(n); }).toThrowError(/does not exist/i);
                });
            });
        });

        describe('tryGet() and get method', () => {
            it('should return an element that exists using normalized lookup', () => {
                expect.assertions(names.length * 8);
                for (const name of names) {
                    let got;
                    expect(() => { got = map.get(name); }).not.toThrow();
                    expect(got.originalName).toBe(name);

                    expect(() => { got = map.get(` ${name.toUpperCase()} `); }).not.toThrow();
                    expect(got.originalName).toBe(name);

                    expect(() => { got = map.tryGet(name); }).not.toThrow();
                    expect(got.originalName).toBe(name);

                    expect(() => { got = map.tryGet(` ${name.toUpperCase()} `); }).not.toThrow();
                    expect(got.originalName).toBe(name);
                }
            });

            it('should return undefined for a name that does not exist', () => {
                const badNames = ['name_', '0therName', 'name3'];
                expect.assertions(badNames.length * 4);
                badNames.forEach((n) => {
                    let got;
                    expect(() => { got = map.tryGet(n); }).not.toThrow();
                    expect(got).toBeUndefined();

                    expect(() => { got = map.get(n); }).not.toThrow();
                    expect(got).toBeUndefined();
                });
            });
        });
    });

    describe('has method', (): void => {
        const map = new NormalizedMap();
        const names = ['Element 1', 'second ELEMENT', 'Third Element'];
        names.forEach((n: string): void => {
            map.set(n, { name: n });
        });
        map.set('EMPTY', null);

        it('should return true if an item with the same normalized name is present', (): void => {
            names.forEach((n: string): void => {
                expect(map.has(n)).toBe(true);
                expect(map.has(Names.normalizeOrThrow(n))).toBe(true);
            });
        });

        it('should return false if no item with the same normalized name is present', (): void => {
            expect(map.has('BLAH BLAH BLAH')).toBe(false);
        });
    });

    describe('clear method', () => {
        const map = new NormalizedMap();
        const numEntries = 10;
        for (let i = 0; i < numEntries; i++) {
            map.set(`Test_${i}`, { number: i });
        }

        it('should remove all elements', () => {
            expect(map.size).toBe(numEntries);
            expect(() => { map.clear(); }).not.toThrow();
            expect(map.size).toBe(0);
        });
    });

    describe('delete method', () => {
        it('should remove an element by normalized name and return true', () => {
            const map = new NormalizedMap();
            const names = ['NAME', 'Other NAME', 'Name_3'];
            names.forEach((n) => map.set(n, { originalName: n }));

            expect(map.has(names[0])).toBe(true);
            expect(map.delete(names[0])).toBe(true);
            expect(map.has(names[0])).toBe(false);

            expect(map.has(names[1])).toBe(true);
            expect(map.delete(`  ${names[1].toUpperCase()} `)).toBe(true);
            expect(map.has(names[1])).toBe(false);
        });

        it('should remove return false and not change the map for an unknown name', () => {
            const map = new NormalizedMap();
            const names = ['NAME', 'Other NAME', 'Name_3'];
            names.forEach((n) => map.set(n, { originalName: n }));

            ['name3', 'other_Name', 'xyzzy'].forEach((n) => {
                expect(map.delete(n)).toBe(false);
            });
        });
    });

    describe('lookupElements method', (): void => {
        it('should return both found and unknown elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const n2 = 'Some Other Element';
            const nn2 = Names.normalizeOrThrow(n2);
            const payload = { contents: 'whatever' };


            map.set(n1, payload);
            const lookup = map.lookupElements([n1, n2]);
            expect(lookup.found).toEqual([payload]);
            expect(lookup.unknown).toEqual([nn2]);
        });

        it('should return each found element only once', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const nn1 = Names.normalizeOrThrow(n1);
            const payload = { contents: 'whatever' };


            map.set(n1, payload);
            const lookup = map.lookupElements([n1, nn1]);
            expect(lookup.found).toEqual([payload]);
        });

        it('should return unique normalized names for unknown elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            const lookupKeys = ['Some other element', 'Another element', n1, 'someotherelemENT'];
            const expectedUnknown = ['someotherelement', 'anotherelement'];

            map.set(n1, payload);
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
            map.set(n1, payload);
            expect(map.getElements([n1])).toEqual([payload]);
        });

        it('should throw if any elements are unknown', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            map.set(n1, payload);
            expect((): void => { map.getElements(['some other string']); }).toThrowError(/unknown/i);
        });
    });

    describe('tryGetElements method', (): void => {
        it('should return found elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            map.set(n1, payload);
            expect(map.tryGetElements([n1])).toEqual([payload]);
        });

        it('should ignore unknown elements', (): void => {
            const map = new NormalizedMap();
            const n1 = 'Test Element';
            const payload = { contents: 'whatever' };
            map.set(n1, payload);
            expect(map.tryGetElements(['some other string'])).toEqual([]);
        });
    });

    describe('iterators', () => {
        const map = new NormalizedMap();
        const names = ['Element 1', 'second ELEMENT', 'Third Element'];
        const normalizedNames = names.map((n) => Names.normalizeOrThrow(n));
        const added = [];
        names.forEach((n: string): void => {
            added.push(map.trySet(n, { name: n }).getValueOrThrow());
        });

        describe('forEach method', (): void => {
            it('should enumerate all elements passing normalized key names', (): void => {
                const found = [];
                map.forEach((e: object, n: string): void => {
                    found.push(e);
                    const gotName = (e as { name: string }).name;
                    expect(Names.normalizeOrThrow(gotName)).toEqual(n);
                });

                expect(found.length).toEqual(added.length);
                found.forEach((f): void => { expect(added).toContain(f); });
                added.forEach((a): void => { expect(found).toContain(a); });
            });
        });

        describe('for .. of (Symbol.iterator)', () => {
            it('should enumerate all elements returning normalized key names', (): void => {
                const found = [];
                for (const entry of map) {
                    found.push(entry[1]);
                    expect(normalizedNames).toContain(entry[0]);
                }

                expect(found.length).toEqual(added.length);
                found.forEach((f): void => { expect(added).toContain(f); });
                added.forEach((a): void => { expect(found).toContain(a); });
            });
        });
    });

    describe('select method', (): void => {
        const map = new NormalizedMap();
        const names = ['Element 1', 'second ELEMENT', 'Third Element'];
        names.forEach((n: string): void => {
            map.set(n, { name: n });
        });
        map.set('EMPTY', null);

        it('should invoke the select method for each element', (): void => {
            let count = 0;
            map.select((value: object, key: string): object => {
                count++;
                expect(key).toEqual(Names.normalizeOrThrow(key));
                return value;
            });
            expect(count).toBe(map.size);
        });

        it('should not include elements in the return for which the select method returns undefined', (): void => {
            const selected = map.select((value: object, key: string): object => {
                if (value) {
                    expect(key).toEqual(Names.normalizeOrThrow(key));
                    return value;
                }
                return undefined;
            });
            expect(selected.length).toBe(map.size - 1);
        });

        it('should include elements in the return for which the select method returns a falsy value other than undefined', (): void => {
            const selected = map.select((value: object, key: string): object => {
                expect(key).toEqual(Names.normalizeOrThrow(key));
                return value;
            });
            expect(selected.length).toBe(map.size);
        });
    });

    describe('entries, keys, and values properties', (): void => {
        const map = new NormalizedMap();
        const entries: [string, object][] = [
            ['Element 1', { name: 'Element 1' }],
            ['second ELEMENT', { name: 'second ELEMENT' }],
            ['Third Element', { name: 'Third Element' }],
        ];
        for (const e of entries) {
            map.set(e[0], e[1]);
        }

        it('should contain all entries with normalized keys', () => {
            const normalizedEntries = entries.map((e) => {
                return [Names.normalizeOrThrow(e[0]), e[1]];
            });

            const found = Array.from(map.entries());
            expect(found).toHaveLength(entries.length);
            expect(found).toEqual(expect.arrayContaining(normalizedEntries));
        });

        it('should contain all normalized keys', () => {
            const normalizedKeys = entries.map((e) => Names.normalizeOrThrow(e[0]));

            const found = Array.from(map.keys());
            expect(found).toHaveLength(entries.length);
            expect(found).toEqual(expect.arrayContaining(normalizedKeys));
        });

        it('should contain all normalized values', () => {
            const values = entries.map((e) => e[1]);

            const found = Array.from(map.values());
            expect(found).toHaveLength(entries.length);
            expect(found).toEqual(expect.arrayContaining(values));
        });
    });
});

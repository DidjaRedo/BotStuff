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
import { Names } from '../../../src/names/names';
import { NormalizedSet } from '../../../src/names/normalizedSet';

describe('NormalizedSet class', () => {
    describe('constructor', () => {
        test('constructs a set with a supplied element description', () => {
            const set = new NormalizedSet('Some Element');
            expect(set.elementDescription).toBe('Some Element');
        });

        test('constructs a set with a default element description', () => {
            const set = new NormalizedSet();
            expect(set.elementDescription).toBe('element');
        });
    });

    describe('add method', () => {
        test('normalizes a valid added name', () => {
            const set = new NormalizedSet('test thing');
            const name = 'non-Normalized Name';
            const normalizedName = Names.normalizeOrThrow(name);

            expect(set.has(name)).toBe(false);
            expect(() => { set.add(name); }).not.toThrow();
            expect(set.has(name)).toBe(true);
            expect(set.has(normalizedName)).toBe(true);
            expect(Array.from(set.values())).toContain(normalizedName);
        });

        test('throws for an invalid added name', () => {
            const set = new NormalizedSet('test thing');
            expect(() => { set.add('   '); }).toThrowError(/test thing.*non-empty/i);
            expect(set.size).toBe(0);
        });
    });

    describe('addRange method', () => {
        test('normalizes all valid added names', () => {
            const set = new NormalizedSet('test thing');
            const names = [
                'non-Normalized Name',
                'normalized',
                '12334_blah',
            ];
            const normalizedNames = Names.normalizeOrThrow(names);

            expect(() => { set.addRange(names); }).not.toThrow();
            names.forEach((n) => expect(set.has(n)).toBe(true));
            normalizedNames.forEach((n) => expect(set.has(n)).toBe(true));
            expect(Array.from(set.values())).toEqual(
                expect.arrayContaining(normalizedNames)
            );
        });

        test('throws without adding if any name is invalid', () => {
            const set = new NormalizedSet('test thing');
            const names = ['Good name', '   ',  'other GooD name'];
            expect(() => { set.addRange(names); }).toThrowError(/test thing.*non-empty/i);
            expect(set.size).toBe(0);
        });
    });

    describe('delete method', () => {
        const names = ['Non-normalized name', 'Name_1', 'alreadynormalizedname'];
        const mungedNames = names.map((n) => `  ${n.toUpperCase()} `);
        test('deletes using normalized names', () => {
            const set = new NormalizedSet();
            set.addRange(names);

            for (const name of mungedNames) {
                expect(set.has(name)).toBe(true);
                expect(set.delete(name)).toBe(true);
                expect(set.has(name)).toBe(false);
            }
        });
    });

    describe('has method', () => {
        const names = ['Non-normalized name', 'Name_1', 'alreadynormalizedname'];
        const mungedNames = names.map((n) => `  ${n.toUpperCase()} `);
        test('tests using normalized names', () => {
            const set = new NormalizedSet();
            set.addRange(names);

            for (const name of mungedNames) {
                expect(set.has(name)).toBe(true);
            }
        });
    });
});

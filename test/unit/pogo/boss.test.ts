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

import { Boss, BossProperties } from '../../../src/pogo/boss';
import { Names } from '../../../src/names/names';

describe('Pogo Boss Module', () => {
    const fullInit: BossProperties = {
        name: 'Giratina - Altered Form',
        alternateNames: ['Giratina'],
        tier: 5,
        pokedexNumber: 123,
        raidGuideName: 'GIRATINA',
        imageFileName: 'GiratinaAltered.png',
        numRaiders: 4,
        cpRange: { min: 1687, max: 1931 },
        boostedCpRange: { min: 2108, max: 2414 },
        active: true,
    };

    describe('constructor', () => {
        test('constructs from a valid initializer', () => {
            let boss;
            expect(() => {
                boss = new Boss(fullInit);
            }).not.toThrow();
            expect(boss).toBeDefined();
            expect(boss).toMatchObject(fullInit);
        });

        test('uses name as displayName by default', () => {
            const boss = new Boss(fullInit);
            expect(boss).toMatchObject({
                ...fullInit,
                displayName: fullInit.name,
            });
        });

        test('uses a displayName if supplied', () => {
            const displayName = (fullInit.alternateNames !== undefined) ? fullInit.alternateNames[0] : 'oops';
            const dnInit = {
                ...fullInit,
                displayName: displayName,
            };
            const boss = new Boss(dnInit);
            expect(boss).toMatchObject(dnInit);
        });

        test('includes tier in the primary key', () => {
            const expected = Names.tryNormalize(`${fullInit.name} T${fullInit.tier}`);
            const boss = new Boss(fullInit);
            expect(boss.primaryKey).toEqual(expected);
        });
    });

    describe('isActive method', () => {
        test('reports an explicit active state or inactive by default', () => {
            const active = new Boss({
                ...fullInit,
                active: true,
            });
            expect(active.isActive()).toBe(true);

            const inactive = new Boss({
                ...fullInit,
                active: false,
            });
            expect(inactive.isActive()).toBe(false);

            const dflt = new Boss({
                ...fullInit,
                active: undefined,
            });
            expect(dflt.isActive()).toBe(false);
        });

        test('reports active state from a supplied time range or now by default', () => {
            const start = new Date(Date.now() - 100000);
            const end = new Date(Date.now() + 100000);
            const active = new Boss({
                ...fullInit,
                active: { start, end },
            });
            expect(active.isActive()).toBe(true);

            expect(active.isActive(new Date(start.getTime() - 10000))).toBe(false);

            const inactive = new Boss({
                ...fullInit,
                active: {
                    start: new Date(Date.now() + 100000),
                },
            });
            expect(inactive.isActive()).toBe(false);
        });
    });

    describe('imageUrl property', () => {
        test('uses a supplied image name', () => {
            const boss = new Boss({ ...fullInit, imageFileName: 'SomeImage.png' });
            expect(boss.imageUrl).toContain('SomeImage.png');
        });

        test('uses the tier image by default', () => {
            const boss = new Boss({ ...fullInit, imageFileName: undefined });
            expect(boss.imageUrl).toContain(`T${fullInit.tier}.png`);
        });
    });

    describe('raidGuideUrl property', () => {
        test('uses a supplied guide name', () => {
            const boss = new Boss({ ...fullInit, raidGuideName: 'GUIDE_FOR_THIS_MON' });
            expect(boss.raidGuideUrl).toContain('GUIDE_FOR_THIS_MON');
        });

        test('uses the normalized boss name by default', () => {
            const boss = new Boss({ ...fullInit, raidGuideName: undefined });
            const expected = Names.tryNormalize(fullInit.name)?.toUpperCase();
            expect(boss.raidGuideUrl).toContain(expected);
        });
    });

    describe('getGuideUrl static method', () => {
        test('returns the URL from a boss', () => {
            const boss1 = new Boss({ ...fullInit, raidGuideName: 'GUIDE_FOR_THIS_MON' });
            expect(Boss.getGuideUrl(boss1)).toContain('GUIDE_FOR_THIS_MON');

            const boss2 = new Boss({ ...fullInit, raidGuideName: undefined });
            const expected = Names.tryNormalize(fullInit.name)?.toUpperCase();
            expect(Boss.getGuideUrl(boss2)).toContain(expected);
        });

        test('returns a default URL if boss is undefined', () => {
            expect(Boss.getGuideUrl(undefined)).toEqual('https://www.pokebattler.com/raids');
        });
    });

    describe('getDirectoryOptions static method', (): void => {
        test('searches by name and alternate name and index by alternate names', (): void => {
            expect(Boss.getDirectoryOptions()).toMatchObject({
                textSearchKeys: [
                    { name: 'displayName' },
                    { name: 'name' },
                    { name: 'alternateNames' },
                ],
                alternateKeys: ['name', 'alternateNames'],
            });
        });
    });
});

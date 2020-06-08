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
        it('should construct from a valid initializer', () => {
            let boss;
            expect(() => {
                boss = new Boss(fullInit);
            }).not.toThrow();
            expect(boss).toBeDefined();
            expect(boss).toMatchObject(fullInit);
        });

        it('should use name as displayName by default', () => {
            const boss = new Boss(fullInit);
            expect(boss).toMatchObject({
                ...fullInit,
                displayName: fullInit.name,
            });
        });

        it('should use a displayName if supplied', () => {
            const dnInit = {
                ...fullInit,
                displayName: fullInit.alternateNames[0],
            };
            const boss = new Boss(dnInit);
            expect(boss).toMatchObject(dnInit);
        });

        it('should include tier in the primary key', () => {
            const expected = Names.tryNormalize(`${fullInit.name} T${fullInit.tier}`);
            const boss = new Boss(fullInit);
            expect(boss.primaryKey).toEqual(expected);
        });
    });

    describe('isActive method', () => {
        it('should report an explicit active state or inactive by default', () => {
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

        it('should report active state from a supplied time range or now by default', () => {
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
        it('should use a supplied image name', () => {
            const boss = new Boss({ ...fullInit, imageFileName: 'SomeImage.png' });
            expect(boss.imageUrl).toContain('SomeImage.png');
        });

        it('should use the tier image by default', () => {
            const boss = new Boss({ ...fullInit, imageFileName: undefined });
            expect(boss.imageUrl).toContain(`T${fullInit.tier}.png`);
        });
    });

    describe('raidGuideUrl property', () => {
        it('should use a supplied guide name', () => {
            const boss = new Boss({ ...fullInit, raidGuideName: 'GUIDE_FOR_THIS_MON' });
            expect(boss.raidGuideUrl).toContain('GUIDE_FOR_THIS_MON');
        });

        it('should use the normalized boss name by default', () => {
            const boss = new Boss({ ...fullInit, raidGuideName: undefined });
            const expected = Names.tryNormalize(fullInit.name).toUpperCase();
            expect(boss.raidGuideUrl).toContain(expected);
        });
    });

    describe('getDirectoryOptions static method', (): void => {
        it('should search by name and alternate name and index by alternate names', (): void => {
            expect(Boss.getDirectoryOptions()).toMatchObject({
                textSearchKeys: [
                    { name: 'displayName' },
                    { name: 'name' },
                    { name: 'alternateNames' },
                ],
                alternateKeys: ['alternateNames'],
            });
        });
    });
});

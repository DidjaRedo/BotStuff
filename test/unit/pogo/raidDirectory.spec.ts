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

import '../../helpers/jestHelpers';
import * as PoiLookupOptions from '../../../src/places/poiLookupOptions';
import { RaidDirectory } from '../../../src/pogo/raidDirectory';
import { TestRaidGenerator } from '../../helpers/pogoHelpers';

describe('RaidDirectory module', () => {
    describe('RaidDirectory class', () => {
        const defaultOptions = PoiLookupOptions.defaultProperties;
        const testRaids = TestRaidGenerator.generate([
            'A12|ex|future|3',
            'A23|nonex|egg|4',
            'B34|ex|hatched|5|boss',
            'B23|nonex',
            'A3|nonex|hatched|2|boss',
            'B4|ex|expired|3',
            'B23|ex|expired|4|boss',
        ]);

        describe('constructor', () => {
            it('should constructe with default options', () => {
                const dir = new RaidDirectory();
                expect(dir.size).toBe(0);
            });

            it('should construct with the supplied raids', () => {
                const actualRaids = testRaids.getActualRaids();
                const dir = new RaidDirectory(actualRaids);
                expect(dir.size).toBe(actualRaids.length);
            });
        });

        describe('lookup method', () => {
            const actualRaids = testRaids.getActualRaids();
            const dir = new RaidDirectory(actualRaids);

            it('should return all raids if no filter is specified', () => {
                const raids = dir.lookup('POI');
                expect(raids).toHaveLength(actualRaids.length);
            });

            it('should return raids matching the lookup string', () => {
                const raids = dir.lookup('POI A');
                expect(raids).toHaveLength(3);
            });

            it('should respect the tier filters if specified', () => {
                const raids = dir.lookup('POI', {
                    ...defaultOptions,
                    minTier: 2,
                    maxTier: 3,
                });
                expect(raids).toHaveLength(3);
                raids.forEach((r) => expect(r.item.tier).toBeInRange(2, 3));
            });

            it('should respect the state filter if specified', () => {
                const raids = dir.lookup('POI', {
                    ...defaultOptions,
                    stateFilter: ['hatched', 'egg'],
                });
                expect(raids).toHaveLength(3);
                raids.forEach((r) => expect(r.item.state).toBeOneOf(['hatched', 'egg']));
            });

            it('should respect the EX filter if specified', () => {
                const exRaids = dir.lookup('POI', {
                    ...defaultOptions,
                    exFilter: 'exEligible',
                });
                exRaids.forEach((r) => expect(r.item.gym.isExEligible).toBe(true));
                expect(exRaids).toHaveLength(4);

                const nonExRaids = dir.lookup('POI', {
                    ...defaultOptions,
                    exFilter: 'nonEx',
                });
                expect(nonExRaids).toHaveLength(2);
                nonExRaids.forEach((r) => expect(r.item.gym.isExEligible).toBe(false));
            });

            it('should respect a supplied filter function', () => {
                const alwaysFilter = jest.fn(() => true);
                const always = dir.lookup('POI', undefined, alwaysFilter);
                expect(always).toHaveLength(actualRaids.length);
                expect(alwaysFilter).toHaveBeenCalledTimes(actualRaids.length);

                const neverFilter = jest.fn(() => false);
                const never = dir.lookup('POI', undefined, neverFilter);
                expect(never).toHaveLength(0);
                expect(neverFilter).toHaveBeenCalledTimes(actualRaids.length);
            });
        });
    });
});

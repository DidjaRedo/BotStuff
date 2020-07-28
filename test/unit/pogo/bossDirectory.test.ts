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

import '@fgv/ts-utils-jest';
import { Boss, BossProperties } from '../../../src/pogo/boss';
import { bossDirectory, loadBossDirectorySync } from '../../../src/pogo/converters/bossConverters';
import { BossDirectory } from '../../../src/pogo/bossDirectory';
import { RaidTier } from '../../../src/pogo/game';
import { loadJson } from '../../helpers/dataHelpers';

describe('BossDirectory module', () => {
    describe('BossDirectory class', () => {
        const bossProps: BossProperties[] = [
            { name: 'Boss inactive', tier: 5, active: false },
            { name: 'Boss active', tier: 4, active: true },
            { name: 'Boss current', tier: 3, active: {
                start: new Date(Date.now() - 10000),
                end: new Date(Date.now() + 10000),
            } },
            { name: 'Boss past', tier: 3, active: {
                start: new Date(Date.now() - 20000),
                end: new Date(Date.now() - 10000),
            } },
            { name: 'Boss future', tier: 2, active: {
                start: new Date(Date.now() + 10000),
                end: new Date(Date.now() + 20000),
            } },
            { name: 'Boss indeterminate', tier: 1 },
        ];
        const bosses = bossProps.map((p) => new Boss(p));

        describe('constructor', () => {
            test('constructs with default options', () => {
                const dir = new BossDirectory();
                expect(dir.size).toBe(0);
            });
            test('constructs with supplied bosses', () => {
                const dir = new BossDirectory(bosses);
                expect(dir.size).toBe(dir.size);
            });
        });

        describe('filterForOptions static method', () => {
            test('filters based on supplied options', () => {
                for (const boss of bosses) {
                    expect(BossDirectory.filterForOptions(boss)).toBe(true);
                    expect(BossDirectory.filterForOptions(boss, { isActive: true })).toBe(boss.isActive());
                    expect(BossDirectory.filterForOptions(boss, { isActive: false })).toBe(!boss.isActive());
                    const tiers: RaidTier[] = [1, 2, 3, 4, 5];
                    for (const tier of tiers) {
                        expect(BossDirectory.filterForOptions(boss, { tier })).toBe(boss.tier === tier);
                    }
                }
            });
        });

        describe('getAll method', () => {
            const dir = new BossDirectory(bosses);
            test('filters according to supplied options', () => {
                expect(dir.getAll()).toEqual(expect.arrayContaining(bosses));
                expect(dir.getAll({ isActive: true })).toEqual(expect.arrayContaining(
                    bosses.filter((b) => b.isActive())
                ));
                expect(dir.getAll({ tier: 3 })).toEqual(expect.arrayContaining(
                    bosses.filter((b) => b.tier === 3)
                ));
            });
        });

        describe('lookup method', () => {
            const dir = new BossDirectory(bosses);
            test('returns all bosses if no filter is specified', () => {
                const bosses = dir.lookup('boss');
                expect(bosses).toHaveLength(bossProps.length);
            });

            test('respects the tier filter if specified', () => {
                for (const tier of [1, 2, 3, 4, 5, 6] as RaidTier[]) {
                    const bosses = dir.lookup('boss', { tier });
                    expect(bosses).toHaveLength(bossProps.filter((p) => p.tier === tier).length);
                    bosses.forEach((b) => expect(b.item.tier).toBe(tier));
                }
            });

            test('respects the active filter if specified', () => {
                const active = dir.lookup('boss', { isActive: true });
                active.forEach((b) => expect(b.item.isActive()).toBe(true));
                expect(active.all().map((r) => r.item.name)).toEqual([
                    'Boss active', 'Boss current',
                ]);

                const inactive = dir.lookup('boss', { isActive: false });
                inactive.forEach((b) => expect(b.item.isActive()).toBe(false));
                expect(inactive.all().map((r) => r.item.name)).toEqual([
                    'Boss inactive', 'Boss past', 'Boss future', 'Boss indeterminate',
                ]);
            });

            test('respects a supplied filter function', () => {
                const alwaysFilter = jest.fn(() => true);
                const always = dir.lookup('boss', {}, alwaysFilter);
                expect(always).toHaveLength(bossProps.length);
                expect(alwaysFilter).toHaveBeenCalledTimes(bossProps.length);

                const neverFilter = jest.fn(() => false);
                const never = dir.lookup('boss', {}, neverFilter);
                expect(never).toHaveLength(0);
                expect(neverFilter).toHaveBeenCalledTimes(bossProps.length);
            });
        });
    });

    // Testing initializers and converters via the all-up bossDirectory converter
    // to avoid massive duplication of tests for intermediate converters and
    // initializers
    describe('bossDirectory converter', () => {
        test('fails when loading an invalid boss directory', () => {
            const testFiles = ['./test/unit/pogo/data/bossDirectoryTests.json'];

            for (const testFile of testFiles) {
                const tests = loadJson(testFile);
                expect(Array.isArray(tests)).toBe(true);
                if (Array.isArray(tests)) {
                    for (const test of tests) {
                        const dirResult = bossDirectory.convert(test.source);
                        expect(dirResult.isFailure()).toBe(true);
                        if (dirResult.isFailure()) {
                            expect(dirResult.message).toMatch(new RegExp(test.expected, 'i'));
                        }
                    }
                }
            }
        });
    });

    describe('loadBossDirectorySync function', () => {
        test('loads a well-formed boss directory json', () => {
            const testFiles = ['./test/unit/pogo/data/validBossDirectory.json'];

            for (const testFile of testFiles) {
                expect(loadBossDirectorySync(testFile)).toSucceed();
            }
        });

        test('fails to load an invalid or non-existent file', () => {
            expect(loadBossDirectorySync('bogus.json')).toFailWith(/no such file/i);
            expect(loadBossDirectorySync('./test/unit/pogo/data')).toFailWith(/illegal operation/i);
            expect(loadBossDirectorySync('./test/unit/pogo/data/invalidBossDirectory.json')).toFailWith(/duplicate entries/i);
            expect(loadBossDirectorySync('./test/unit/pogo/data/empty.json')).toFailWith(/not an array/i);
            expect(loadBossDirectorySync('./test/unit/pogo/data/malformed.json')).toFailWith(/unexpected token/i);
        });
    });
});

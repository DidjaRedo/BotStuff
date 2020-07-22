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

import '../../../helpers/jestHelpers';
import { categorizedRaidsFormatters, raidFormatters } from '../../../../src/pogo/formatters/raidFormatter';
import { Boss } from '../../../../src/pogo/boss';
import { FormatTargets } from '../../../../src/utils/formatter';
import { Raid } from '../../../../src/pogo/raid';
import { TestRaidManager } from '../../../helpers/pogoHelpers';
import moment from 'moment';
import { succeed } from '../../../../src/utils/result';

describe('Raid formatters', () => {
    type RaidFormatResultByTarget = Record<FormatTargets, string>;

    type TestGyms = 'anderson'|'hartman'|'northstar'|'viewpoint';
    type RaidFormatTestRaids = Record<TestGyms, Raid>;

    type RaidTestsByGym<T> = Record<keyof T, string|RaidFormatResultByTarget>;
    type RaidFormatTestCase = { format: string } & RaidTestsByGym<RaidFormatTestRaids>;

    const testTargets: FormatTargets[] = ['text', 'markdown', 'embed'];
    const testGyms: TestGyms[] = ['anderson', 'hartman', 'northstar', 'viewpoint'];

    const { rm } = TestRaidManager.setup(['viewpoint|future|3', 'hartman|expired|5|boss']);
    const testRaids: RaidFormatTestRaids = {
        hartman: rm.getRaid('hartman').getValueOrThrow(),
        northstar: rm.addActiveRaid(30, 'northstar', 'giratina').getValueOrThrow(),
        anderson: rm.addFutureRaid(30, 'anderson', 4).getValueOrThrow(),
        viewpoint: rm.getRaid('viewpoint').getValueOrThrow(),
    };

    expect(testRaids.hartman.boss).toBeDefined();
    const hartmanBoss = testRaids.hartman.boss as Boss;

    describe('raidFormatters', () => {
        function getResultsByTarget(test: string|RaidFormatResultByTarget): RaidFormatResultByTarget {
            // this is a hack to allow 'expect.stringContaining' and 'expect.Matching'
            // ideally we'd add them to the signature explicitly but it looks like jest
            // doesn't export the intermediate types we'd need to do that
            if ((typeof test === 'string') || (test.text === undefined)) {
                return {
                    text: test as string,
                    markdown: test as string,
                    embed: test as string,
                };
            }
            return test;
        }

        function testOneFormat(test: RaidFormatTestCase): void {
            for (const gym of testGyms) {
                const raid = testRaids[gym];
                const expected = getResultsByTarget(test[gym]);
                for (const target of testTargets) {
                    expect(raidFormatters[target](test.format, raid)).toSucceedWith(expected[target]);
                }
            }
        }

        it('should format state correctly', () => {
            testOneFormat({
                format: '{{state}}',
                anderson: 'Upcoming',
                hartman: 'Expired',
                northstar: 'Current',
                viewpoint: 'Future',
            });
        });

        it('should format tier and bossName correctly', () => {
            testOneFormat({
                format: '{{tier}} {{bossName}}',
                anderson: 'T4 Unknown',
                hartman: `T${hartmanBoss.tier} ${hartmanBoss.displayName}`,
                northstar: 'T5 Giratina',
                viewpoint: 'T3 Unknown',
            });
        });

        it('should format bossDescription correctly', () => {
            testOneFormat({
                format: '{{bossDescription}}',
                anderson: {
                    text: 'T4 Unknown',
                    markdown: 'T4 Unknown',
                    embed: '[T4 Unknown](https://www.pokebattler.com/raids)',
                },
                hartman: {
                    text: `T${hartmanBoss.tier} ${hartmanBoss.displayName}`,
                    markdown: `T${hartmanBoss.tier} ${hartmanBoss.displayName}`,
                    embed: `[T${hartmanBoss.tier} ${hartmanBoss.displayName}](${hartmanBoss.raidGuideUrl})`,
                },
                northstar: {
                    text: 'T5 Giratina',
                    markdown: 'T5 Giratina',
                    embed: '[T5 Giratina](https://www.pokebattler.com/raids/GIRATINAALTEREDFORME)',
                },
                viewpoint: {
                    text: 'T3 Unknown',
                    markdown: 'T3 Unknown',
                    embed: '[T3 Unknown](https://www.pokebattler.com/raids)',
                },
            });
        });

        it('should format gymName and exStatus correctly', () => {
            testOneFormat({
                format: '{{gymName}}{{exStatus}}',
                anderson: 'Anderson Park',
                hartman: 'Hartman Park Sign [EX]',
                northstar: 'Northstar Park [EX]',
                viewpoint: 'Viewpoint Park',
            });
        });

        it('should format directions correctly', () => {
            testOneFormat({
                format: '{{directions}}',
                anderson: expect.stringContaining('google.com/maps'),
                hartman: expect.stringContaining('google.com/maps'),
                northstar: expect.stringContaining('google.com/maps'),
                viewpoint: expect.stringContaining('google.com/maps'),
            });
        });

        it('should format nameAndDirections correctly', () => {
            testOneFormat({
                format: '{{nameAndDirections}}',
                anderson: {
                    text: 'Anderson Park',
                    markdown: 'Anderson Park',
                    embed: '[Anderson Park](https://www.google.com/maps/dir/?api=1&destination=47.67374,-122.116119)',
                },
                hartman: {
                    text: 'Hartman Park Sign',
                    markdown: 'Hartman Park Sign',
                    embed: '[Hartman Park Sign](https://www.google.com/maps/dir/?api=1&destination=47.691002,-122.110177)',
                },
                northstar: {
                    text: 'Northstar Park',
                    markdown: 'Northstar Park',
                    embed: '[Northstar Park](https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114)',
                },
                viewpoint: {
                    text: 'Viewpoint Park',
                    markdown: 'Viewpoint Park',
                    embed: '[Viewpoint Park](https://www.google.com/maps/dir/?api=1&destination=47.631212,-122.093925)',
                },
            });
        });

        it('should format nameDirectionsAndExStatus correctly', () => {
            testOneFormat({
                format: '{{nameDirectionsAndExStatus}}',
                anderson: {
                    text: 'Anderson Park',
                    markdown: 'Anderson Park',
                    embed: '[Anderson Park](https://www.google.com/maps/dir/?api=1&destination=47.67374,-122.116119)',
                },
                hartman: {
                    text: 'Hartman Park Sign [EX]',
                    markdown: 'Hartman Park Sign [EX]',
                    embed: '[Hartman Park Sign](https://www.google.com/maps/dir/?api=1&destination=47.691002,-122.110177) [EX]',
                },
                northstar: {
                    text: 'Northstar Park [EX]',
                    markdown: 'Northstar Park [EX]',
                    embed: '[Northstar Park](https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114) [EX]',
                },
                viewpoint: {
                    text: 'Viewpoint Park',
                    markdown: 'Viewpoint Park',
                    embed: '[Viewpoint Park](https://www.google.com/maps/dir/?api=1&destination=47.631212,-122.093925)',
                },
            });
        });

        it('should format hatchTime correctly', () => {
            testOneFormat({
                format: '{{hatchTime}}',
                anderson: moment(testRaids.anderson.hatchTime).format('h:mm A'),
                hartman: moment(testRaids.hartman.hatchTime).format('YYYY-MM-DD h:mm A'),
                northstar: moment(testRaids.northstar.hatchTime).format('h:mm A'),
                viewpoint: moment(testRaids.viewpoint.hatchTime).format('YYYY-MM-DD h:mm A'),
            });
        });

        it('should format expiryTime correctly', () => {
            testOneFormat({
                format: '{{expiryTime}}',
                anderson: moment(testRaids.anderson.expiryTime).format('h:mm A'),
                hartman: moment(testRaids.hartman.expiryTime).format('YYYY-MM-DD h:mm A'),
                northstar: moment(testRaids.northstar.expiryTime).format('h:mm A'),
                viewpoint: moment(testRaids.viewpoint.expiryTime).format('YYYY-MM-DD h:mm A'),
            });
        });

        it('should format city correctly', () => {
            testOneFormat({
                format: '{{city}}',
                anderson: 'Redmond',
                hartman: 'Redmond',
                northstar: 'Redmond',
                viewpoint: 'Overlake',
            });
        });

        it('should format guideLink correctly', () => {
            testOneFormat({
                format: '{{guideLink}}',
                anderson: 'https://www.pokebattler.com/raids',
                hartman: 'https://www.pokebattler.com/raids/ARMOREDMEWTWO',
                northstar: 'https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
                viewpoint: 'https://www.pokebattler.com/raids',
            });
        });

        it('should format description correctly', () => {
            testOneFormat({
                format: '{{description}}',
                anderson: {
                    text: expect.stringMatching(/^\[T4] Anderson Park @ \d?\d:\d\d [AP]M$/i),
                    markdown: expect.stringMatching(/^\[T4] Anderson Park \*@ \d?\d:\d\d [AP]M\*$/i),
                    embed: expect.stringMatching(
                        /^\[T4] \[Anderson Park]\(https:\/\/www.google.com\/maps.*\) \*@ \d?\d:\d\d [AP]M\*$/i
                    ),
                },
                hartman: {
                    text: expect.stringMatching(/^\[T5 .*\] Hartman Park Sign \[EX\] ended @ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M$/i),
                    markdown: expect.stringMatching(/^\[T5 .*\] Hartman Park Sign \[EX\] \*ended @ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M\*$/i),
                    embed: expect.stringMatching(
                        // eslint-disable-next-line max-len
                        /^\[\[T5 .*\]\(https:..www.pokebattler.com.*\)\] \[Hartman Park Sign\]\(https:..www.google.com.maps.*\) \[EX\] \*ended @ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M\*$/i
                    ),
                },
                northstar: {
                    text: expect.stringMatching(/^\[T5 Giratina\] Northstar Park \[EX\] ends @ \d?\d:\d\d [AP]M$/i),
                    markdown: expect.stringMatching(/^\[T5 Giratina\] Northstar Park \[EX\] \*ends @ \d?\d:\d\d [AP]M\*$/i),
                    embed: expect.stringMatching(
                        /^\[\[T5 Giratina\]\(https:..www.pokebattler.com.*\)\] \[Northstar Park\]\(https:..www.google.com.maps.*\) \[EX\] \*ends @ \d?\d:\d\d [AP]M\*$/i
                    ),
                },
                viewpoint: {
                    text: expect.stringMatching(/^\[T3] Viewpoint Park @ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M$/i),
                    markdown: expect.stringMatching(/^\[T3] Viewpoint Park \*@ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M\*$/i),
                    embed: expect.stringMatching(
                        /^\[T3] \[Viewpoint Park\]\(https:..www.google.com.*\) \*@ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M\*$/i
                    ),
                },
            });
        });
    });

    describe('categorizedRaidFormatters', () => {
        const categorized = rm.getAllRaids().onSuccess((raids) => {
            return succeed(Raid.categorizeRaids(raids));
        }).getValueOrThrow();
        expect(categorizedRaidsFormatters.text('{{description}}', categorized).getValueOrThrow().split('\n')).toEqual([
            'ACTIVE RAIDS',
            expect.stringMatching(/northstar/i),
            'UPCOMING RAIDS',
            expect.stringMatching(/anderson/i),
            'FUTURE RAIDS',
            expect.stringMatching(/viewpoint/i),
            'EXPIRED RAIDS',
            expect.stringMatching(/hartman/i),
        ]);
    });
});

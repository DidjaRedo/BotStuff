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

import { Boss, Raid } from '../../../../src/pogo';
import { FormatTargets, succeed } from '@fgv/ts-utils';
import {
    categorizedRaidsFormatters,
    getCategorizedRaidsFormatters,
    raidFormatters,
    raidsFormatters,
} from '../../../../src/pogo/formatters';

import { TestRaidManager } from '../../../helpers/pogoHelpers';
import { evaluateTestCase } from '../../../helpers/formatHelpers';
import moment from 'moment';

describe('Raid formatters', () => {
    type RaidFormatResultByTarget = Record<FormatTargets, string>;

    type TestGyms = 'anderson' | 'hartman' | 'northstar' | 'viewpoint';
    type RaidFormatTestRaids = Record<TestGyms, Raid>;

    type RaidTestsByGym<T> = Record<keyof T, string | RaidFormatResultByTarget>;
    type RaidFormatTestCase = { format: string } & RaidTestsByGym<
        RaidFormatTestRaids
    >;

    const testTargets: FormatTargets[] = ['text', 'markdown', 'embed'];
    const testGyms: TestGyms[] = [
        'anderson',
        'hartman',
        'northstar',
        'viewpoint',
    ];

    const { rm } = TestRaidManager.setup([
        'viewpoint|future|3',
        'hartman|expired|5|boss',
    ]);
    const testRaids: RaidFormatTestRaids = {
        hartman: rm.getRaid('hartman').getValueOrThrow(),
        northstar: rm.addActiveRaid(30, 'northstar', 'giratina').getValueOrThrow(),
        anderson: rm.addFutureRaid(30, 'anderson', 4).getValueOrThrow(),
        viewpoint: rm.getRaid('viewpoint').getValueOrThrow(),
    };

    expect(testRaids.hartman.boss).toBeDefined();
    const hartmanBoss = testRaids.hartman.boss as Boss;

    describe('raidFormatters', () => {
        function getResultsByTarget(
            test: string | RaidFormatResultByTarget
        ): RaidFormatResultByTarget {
            // this is a hack to allow 'expect.stringContaining' and 'expect.Matching'
            // ideally we'd add them to the signature explicitly but it looks like jest
            // doesn't export the intermediate types we'd need to do that
            if (typeof test === 'string' || test.text === undefined) {
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
                    expect(raidFormatters[target](test.format, raid)).toSucceedWith(
                        expected[target]
                    );
                }
            }
        }

        test('formats state correctly', () => {
            testOneFormat({
                format: '{{state}}',
                anderson: 'Upcoming',
                hartman: 'Expired',
                northstar: 'Current',
                viewpoint: 'Future',
            });
        });

        test('formats tier and bossName correctly', () => {
            testOneFormat({
                format: '{{tier}} {{bossName}}',
                anderson: 'T4 Unknown',
                hartman: `T${hartmanBoss.tier} ${hartmanBoss.displayName}`,
                northstar: 'T5 Giratina',
                viewpoint: 'T3 Unknown',
            });
        });

        test('formats bossDescription correctly', () => {
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
                    embed:
                        '[T5 Giratina](https://www.pokebattler.com/raids/GIRATINAALTEREDFORME)',
                },
                viewpoint: {
                    text: 'T3 Unknown',
                    markdown: 'T3 Unknown',
                    embed: '[T3 Unknown](https://www.pokebattler.com/raids)',
                },
            });
        });

        test('formats gymName and exStatus correctly', () => {
            testOneFormat({
                format: '{{gymName}}{{exStatus}}',
                anderson: 'Anderson Park',
                hartman: 'Hartman Park Sign [EX]',
                northstar: 'Northstar Park [EX]',
                viewpoint: 'Viewpoint Park',
            });
        });

        test('formats directions correctly', () => {
            testOneFormat({
                format: '{{directions}}',
                anderson: expect.stringContaining('google.com/maps'),
                hartman: expect.stringContaining('google.com/maps'),
                northstar: expect.stringContaining('google.com/maps'),
                viewpoint: expect.stringContaining('google.com/maps'),
            });
        });

        test('formats nameAndDirections correctly', () => {
            testOneFormat({
                format: '{{nameAndDirections}}',
                anderson: {
                    text: 'Anderson Park',
                    markdown: 'Anderson Park',
                    embed:
                        '[Anderson Park](https://www.google.com/maps/dir/?api=1&destination=47.67374,-122.116119)',
                },
                hartman: {
                    text: 'Hartman Park Sign',
                    markdown: 'Hartman Park Sign',
                    embed:
                        '[Hartman Park Sign](https://www.google.com/maps/dir/?api=1&destination=47.691002,-122.110177)',
                },
                northstar: {
                    text: 'Northstar Park',
                    markdown: 'Northstar Park',
                    embed:
                        '[Northstar Park](https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114)',
                },
                viewpoint: {
                    text: 'Viewpoint Park',
                    markdown: 'Viewpoint Park',
                    embed:
                        '[Viewpoint Park](https://www.google.com/maps/dir/?api=1&destination=47.631212,-122.093925)',
                },
            });
        });

        test('formats nameDirectionsAndExStatus correctly', () => {
            testOneFormat({
                format: '{{nameDirectionsAndExStatus}}',
                anderson: {
                    text: 'Anderson Park',
                    markdown: 'Anderson Park',
                    embed:
                        '[Anderson Park](https://www.google.com/maps/dir/?api=1&destination=47.67374,-122.116119)',
                },
                hartman: {
                    text: 'Hartman Park Sign [EX]',
                    markdown: 'Hartman Park Sign [EX]',
                    embed:
                        '[Hartman Park Sign](https://www.google.com/maps/dir/?api=1&destination=47.691002,-122.110177) [EX]',
                },
                northstar: {
                    text: 'Northstar Park [EX]',
                    markdown: 'Northstar Park [EX]',
                    embed:
                        '[Northstar Park](https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114) [EX]',
                },
                viewpoint: {
                    text: 'Viewpoint Park',
                    markdown: 'Viewpoint Park',
                    embed:
                        '[Viewpoint Park](https://www.google.com/maps/dir/?api=1&destination=47.631212,-122.093925)',
                },
            });
        });

        test('formats hatchTime correctly', () => {
            testOneFormat({
                format: '{{hatchTime}}',
                anderson: moment(testRaids.anderson.hatchTime).format('h:mm A'),
                hartman: moment(testRaids.hartman.hatchTime).format(
                    'YYYY-MM-DD h:mm A'
                ),
                northstar: moment(testRaids.northstar.hatchTime).format('h:mm A'),
                viewpoint: moment(testRaids.viewpoint.hatchTime).format(
                    'YYYY-MM-DD h:mm A'
                ),
            });
        });

        test('formats expiryTime correctly', () => {
            testOneFormat({
                format: '{{expiryTime}}',
                anderson: moment(testRaids.anderson.expiryTime).format('h:mm A'),
                hartman: moment(testRaids.hartman.expiryTime).format(
                    'YYYY-MM-DD h:mm A'
                ),
                northstar: moment(testRaids.northstar.expiryTime).format('h:mm A'),
                viewpoint: moment(testRaids.viewpoint.expiryTime).format(
                    'YYYY-MM-DD h:mm A'
                ),
            });
        });

        test('formats city correctly', () => {
            testOneFormat({
                format: '{{city}}',
                anderson: 'Redmond',
                hartman: 'Redmond',
                northstar: 'Redmond',
                viewpoint: 'Overlake',
            });
        });

        test('formats guideLink correctly', () => {
            testOneFormat({
                format: '{{guideLink}}',
                anderson: 'https://www.pokebattler.com/raids',
                hartman: 'https://www.pokebattler.com/raids/ARMOREDMEWTWO',
                northstar: 'https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
                viewpoint: 'https://www.pokebattler.com/raids',
            });
        });

        test('formats description correctly', () => {
            testOneFormat({
                format: '{{description}}',
                anderson: {
                    text: expect.stringMatching(
                        /^\[T4] Anderson Park @ \d?\d:\d\d [AP]M$/i
                    ),
                    markdown: expect.stringMatching(
                        /^\[T4] Anderson Park \*@ \d?\d:\d\d [AP]M\*$/i
                    ),
                    embed: expect.stringMatching(
                        /^\[T4] \[Anderson Park]\(https:\/\/www.google.com\/maps.*\) \*@ \d?\d:\d\d [AP]M\*$/i
                    ),
                },
                hartman: {
                    text: expect.stringMatching(
                        /^\[T5 .*\] Hartman Park Sign \[EX\] ended @ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M$/i
                    ),
                    markdown: expect.stringMatching(
                        /^\[T5 .*\] Hartman Park Sign \[EX\] \*ended @ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M\*$/i
                    ),
                    embed: expect.stringMatching(
                        // eslint-disable-next-line max-len
                        /^\[\[T5 .*\]\(https:..www.pokebattler.com.*\)\] \[Hartman Park Sign\]\(https:..www.google.com.maps.*\) \[EX\] \*ended @ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M\*$/i
                    ),
                },
                northstar: {
                    text: expect.stringMatching(
                        /^\[T5 Giratina\] Northstar Park \[EX\] ends @ \d?\d:\d\d [AP]M$/i
                    ),
                    markdown: expect.stringMatching(
                        /^\[T5 Giratina\] Northstar Park \[EX\] \*ends @ \d?\d:\d\d [AP]M\*$/i
                    ),
                    embed: expect.stringMatching(
                        /^\[\[T5 Giratina\]\(https:..www.pokebattler.com.*\)\] \[Northstar Park\]\(https:..www.google.com.maps.*\) \[EX\] \*ends @ \d?\d:\d\d [AP]M\*$/i
                    ),
                },
                viewpoint: {
                    text: expect.stringMatching(
                        /^\[T3] Viewpoint Park @ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M$/i
                    ),
                    markdown: expect.stringMatching(
                        /^\[T3] Viewpoint Park \*@ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M\*$/i
                    ),
                    embed: expect.stringMatching(
                        /^\[T3] \[Viewpoint Park\]\(https:..www.google.com.*\) \*@ \d\d\d\d-\d\d-\d\d \d?\d:\d\d [AP]M\*$/i
                    ),
                },
            });
        });
    });

    describe('raidsFormatter', () => {
        const raidsTest = {
            raidList: Object.values(testRaids),
        };
        test('concatenates results from each gym separated by newlines', () => {
            expect(evaluateTestCase('{{gymName}}', raidsTest, raidsFormatters))
                .toMatchInlineSnapshot(`
        Object {
          "raidList": "Hartman Park Sign
        Northstar Park
        Anderson Park
        Viewpoint Park",
        }
      `);
        });

        test('uses the text, markdown or embed formatter for each gym as appropriate', () => {
            expect(
                evaluateTestCase('{{nameAndDirections}}', raidsTest, raidsFormatters)
            ).toMatchInlineSnapshot(`
        Object {
          "raidList": Object {
            "embed": "[Hartman Park Sign](https://www.google.com/maps/dir/?api=1&destination=47.691002,-122.110177)
        [Northstar Park](https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114)
        [Anderson Park](https://www.google.com/maps/dir/?api=1&destination=47.67374,-122.116119)
        [Viewpoint Park](https://www.google.com/maps/dir/?api=1&destination=47.631212,-122.093925)",
            "markdown": "Hartman Park Sign
        Northstar Park
        Anderson Park
        Viewpoint Park",
            "text": "Hartman Park Sign
        Northstar Park
        Anderson Park
        Viewpoint Park",
          },
        }
      `);
        });
    });

    describe('categorizedRaidFormatters', () => {
        const categorized = rm
            .getAllRaids()
            .onSuccess((raids) => {
                return succeed(Raid.categorizeRaids(raids));
            })
            .getValueOrThrow();

        describe('text formatter', () => {
            test('formats categorized raids correctly', () => {
                expect(
                    categorizedRaidsFormatters
                        .text('{{description}}', categorized)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
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

            test('formats empty list correctly', () => {
                const empty = { active: [], upcoming: [], future: [], expired: [] };
                expect(
                    categorizedRaidsFormatters
                        .text('{{description}}', empty)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    'RAIDS',
                    'No raids reported.',
                ]);
            });

            test('displays header if supplied', () => {
                expect(
                    getCategorizedRaidsFormatters('SOME LABEL')
                        .text('{{description}}', categorized)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    'ACTIVE RAIDS (SOME LABEL)',
                    expect.stringMatching(/northstar/i),
                    'UPCOMING RAIDS (SOME LABEL)',
                    expect.stringMatching(/anderson/i),
                    'FUTURE RAIDS (SOME LABEL)',
                    expect.stringMatching(/viewpoint/i),
                    'EXPIRED RAIDS (SOME LABEL)',
                    expect.stringMatching(/hartman/i),
                ]);
            });

            test('displays header for an empty list correctly', () => {
                const empty = { active: [], upcoming: [], future: [], expired: [] };
                expect(
                    getCategorizedRaidsFormatters('SOME LABEL')
                        .text('{{description}}', empty)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    'RAIDS (SOME LABEL)',
                    'No raids reported.',
                ]);
            });

            test('formats activeRaids correctly', () => {
                expect(categorizedRaidsFormatters
                    .text('{{activeRaids}}', categorized)
                    .getValueOrThrow()
                    .split('\n')
                ).toEqual([
                    expect.stringMatching(/northstar/i),
                ]);
            });

            test('formats upcomingRaids correctly', () => {
                expect(categorizedRaidsFormatters
                    .text('{{upcomingRaids}}', categorized)
                    .getValueOrThrow()
                    .split('\n')
                ).toEqual([
                    expect.stringMatching(/anderson/i),
                ]);
            });

            test('formats futureRaids correctly', () => {
                expect(categorizedRaidsFormatters
                    .text('{{futureRaids}}', categorized)
                    .getValueOrThrow()
                    .split('\n')
                ).toEqual([
                    expect.stringMatching(/viewpoint/i),
                ]);
            });

            test('formats expiredRaids correctly', () => {
                expect(categorizedRaidsFormatters
                    .text('{{expiredRaids}}', categorized)
                    .getValueOrThrow()
                    .split('\n')
                ).toEqual([
                    expect.stringMatching(/hartman/i),
                ]);
            });
        });

        describe('markdown formatter', () => {
            test('formats categorized raids correctly', () => {
                expect(
                    categorizedRaidsFormatters
                        .markdown('{{description}}', categorized)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    '__**ACTIVE RAIDS**__',
                    expect.stringMatching(/northstar/i),
                    '__**UPCOMING RAIDS**__',
                    expect.stringMatching(/anderson/i),
                    '__**FUTURE RAIDS**__',
                    expect.stringMatching(/viewpoint/i),
                    '__**EXPIRED RAIDS**__',
                    expect.stringMatching(/hartman/i),
                ]);
            });

            test('formats empty list correctly', () => {
                const empty = { active: [], upcoming: [], future: [], expired: [] };
                expect(
                    categorizedRaidsFormatters
                        .markdown('{{description}}', empty)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    '__**RAIDS**__',
                    'No raids reported.',
                ]);
            });

            test('displays header if supplied', () => {
                expect(
                    getCategorizedRaidsFormatters('SOME LABEL')
                        .markdown('{{description}}', categorized)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    '__**ACTIVE RAIDS (SOME LABEL)**__',
                    expect.stringMatching(/northstar/i),
                    '__**UPCOMING RAIDS (SOME LABEL)**__',
                    expect.stringMatching(/anderson/i),
                    '__**FUTURE RAIDS (SOME LABEL)**__',
                    expect.stringMatching(/viewpoint/i),
                    '__**EXPIRED RAIDS (SOME LABEL)**__',
                    expect.stringMatching(/hartman/i),
                ]);
            });

            test('displays header for an empty list correctly', () => {
                const empty = { active: [], upcoming: [], future: [], expired: [] };
                expect(
                    getCategorizedRaidsFormatters('SOME LABEL')
                        .markdown('{{description}}', empty)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    '__**RAIDS (SOME LABEL)**__',
                    'No raids reported.',
                ]);
            });
        });

        describe('embed formatter', () => {
            test('formats categorized raids correctly', () => {
                expect(
                    categorizedRaidsFormatters
                        .embed('{{description}}', categorized)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    '__**ACTIVE RAIDS**__',
                    expect.stringMatching(/northstar/i),
                    '__**UPCOMING RAIDS**__',
                    expect.stringMatching(/anderson/i),
                    '__**FUTURE RAIDS**__',
                    expect.stringMatching(/viewpoint/i),
                    '__**EXPIRED RAIDS**__',
                    expect.stringMatching(/hartman/i),
                ]);
            });

            test('formats empty list correctly', () => {
                const empty = { active: [], upcoming: [], future: [], expired: [] };
                expect(
                    categorizedRaidsFormatters
                        .embed('{{description}}', empty)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    '__**RAIDS**__',
                    'No raids reported.',
                ]);
            });

            test('displays header if supplied', () => {
                expect(
                    getCategorizedRaidsFormatters('SOME LABEL')
                        .embed('{{description}}', categorized)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    '__**ACTIVE RAIDS (SOME LABEL)**__',
                    expect.stringMatching(/northstar/i),
                    '__**UPCOMING RAIDS (SOME LABEL)**__',
                    expect.stringMatching(/anderson/i),
                    '__**FUTURE RAIDS (SOME LABEL)**__',
                    expect.stringMatching(/viewpoint/i),
                    '__**EXPIRED RAIDS (SOME LABEL)**__',
                    expect.stringMatching(/hartman/i),
                ]);
            });

            test('displays header for an empty list correctly', () => {
                const empty = { active: [], upcoming: [], future: [], expired: [] };
                expect(
                    getCategorizedRaidsFormatters('SOME LABEL')
                        .embed('{{description}}', empty)
                        .getValueOrThrow()
                        .split('\n')
                ).toEqual([
                    '__**RAIDS (SOME LABEL)**__',
                    'No raids reported.',
                ]);
            });
        });
    });
});

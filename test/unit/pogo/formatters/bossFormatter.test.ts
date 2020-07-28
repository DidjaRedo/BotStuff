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

import { bossFormatters, bossesFormatters } from '../../../../src/pogo/formatters';

import { Boss } from '../../../../src/pogo/boss';
import { DateRange } from '../../../../src/time/dateRange';
import { FormatTargets } from '@fgv/ts-utils';
import { TestRaidManager } from '../../../helpers/pogoHelpers';

import moment from 'moment';

describe('Boss formatters', () => {
    type BossFormatResultByTarget = Record<FormatTargets, string>;

    type TestBosses = 'giratinaAF'|'klink';
    type BossFormatTestBosses = Record<TestBosses, Boss>;

    type BossTestsByBoss<T> = Record<keyof T, string|BossFormatResultByTarget|undefined>;
    type BossFormatTestCase = { format: string } & BossTestsByBoss<BossFormatTestBosses>;

    const testTargets: FormatTargets[] = ['text', 'markdown', 'embed'];
    const testBossKeys: TestBosses[] = ['giratinaAF', 'klink'];

    const { rm } = TestRaidManager.setup([]);
    const bosses = rm.bosses;

    const testBosses: BossFormatTestBosses = {
        giratinaAF: bosses.lookup('giratina altered forme').singleItem().getValueOrThrow(),
        klink: bosses.lookup('klink').singleItem().getValueOrThrow(),
    };

    function getResultsByTarget(test: string|BossFormatResultByTarget|undefined): BossFormatResultByTarget {
        // this is a hack to allow 'expect.stringContaining' and 'expect.Matching'
        // ideally we'd add them to the signature explicitly but it looks like jest
        // doesn't export the intermediate types we'd need to do that
        if ((typeof test === 'string') || (test === undefined)) {
            return {
                text: test as string,
                markdown: test as string,
                embed: test as string,
            };
        }
        else if (test?.text === undefined) {
            return {
                text: undefined as unknown as string,
                markdown: undefined as unknown as string,
                embed: undefined as unknown as string,
            };
        }
        return test;
    }

    function testOneFormat(test: BossFormatTestCase): void {
        for (const boss of testBossKeys) {
            const expected = getResultsByTarget(test[boss]);
            for (const target of testTargets) {
                expect(bossFormatters[target](test.format, testBosses[boss])).toSucceedWith(expected[target]);
            }
        }
    }

    test('formats name correctly', () => {
        testOneFormat({
            format: '{{name}}',
            giratinaAF: 'Giratina Altered Forme',
            klink: 'Klink',
        });
    });

    test('formats displayName correctly', () => {
        testOneFormat({
            format: '{{displayName}}',
            giratinaAF: 'Giratina',
            klink: 'Klink',
        });
    });

    test('formats alternateNames correctly', () => {
        testOneFormat({
            format: '{{alternateNames}}',
            giratinaAF: 'Giratina',
            klink: '',
        });
    });

    test('formats otherNames correctly', () => {
        testOneFormat({
            format: '{{otherNames}}',
            giratinaAF: 'Giratina Altered Forme',
            klink: '',
        });
    });

    test('formats tier correcty', () => {
        testOneFormat({
            format: '{{tier}}',
            giratinaAF: 'T5',
            klink: 'T1',
        });
    });

    test('formats description correcty', () => {
        testOneFormat({
            format: '{{description}}',
            giratinaAF: {
                text: 'T5 Giratina',
                markdown: 'T5 Giratina',
                embed: '[T5 Giratina](https://www.pokebattler.com/raids/GIRATINAALTEREDFORME)',
            },
            klink: {
                text: 'T1 Klink',
                markdown: 'T1 Klink',
                embed: '[T1 Klink](https://www.pokebattler.com/raids/KLINK)',
            },
        });
    });

    test('formats pokedexNumber correctly', () => {
        testOneFormat({
            format: '{{pokedexNumber}}',
            giratinaAF: '487',
            klink: '',
        });
    });

    test('formats raidGuide correctly', () => {
        testOneFormat({
            format: '{{raidGuide}}',
            giratinaAF: {
                text: 'https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
                markdown: 'https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
                embed: '[GIRATINAALTEREDFORME](https://www.pokebattler.com/raids/GIRATINAALTEREDFORME)',
            },
            klink: {
                text: 'https://www.pokebattler.com/raids/KLINK',
                markdown: 'https://www.pokebattler.com/raids/KLINK',
                embed: '[KLINK](https://www.pokebattler.com/raids/KLINK)',
            },
        });
    });

    test('formats image correctly', () => {
        testOneFormat({
            format: '{{image}}',
            giratinaAF: {
                text: 'http://www.didjaredo.com/pogo/images/32x32/T5.png',
                markdown: 'http://www.didjaredo.com/pogo/images/32x32/T5.png',
                embed: '[T5.png](http://www.didjaredo.com/pogo/images/32x32/T5.png)',
            },
            klink: {
                text: 'http://www.didjaredo.com/pogo/images/32x32/T1.png',
                markdown: 'http://www.didjaredo.com/pogo/images/32x32/T1.png',
                embed: '[T1.png](http://www.didjaredo.com/pogo/images/32x32/T1.png)',
            },
        });
    });

    test('formats raidGuideUrl correctly', () => {
        testOneFormat({
            format: '{{raidGuideUrl}}',
            giratinaAF: 'https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
            klink: 'https://www.pokebattler.com/raids/KLINK',
        });
    });

    test('formats imageUrl correctly', () => {
        testOneFormat({
            format: '{{imageUrl}}',
            giratinaAF: 'http://www.didjaredo.com/pogo/images/32x32/T5.png',
            klink: 'http://www.didjaredo.com/pogo/images/32x32/T1.png',
        });
    });

    test('formats numRaiders correctly', () => {
        testOneFormat({
            format: '{{numRaiders}}',
            giratinaAF: '2',
            klink: '1',
        });
    });

    test('formats undefined numRaiders as an empty string', () => {
        const boss = new Boss({
            name: 'First Boss',
            tier: 5,
            active: true,
        });

        expect(bossFormatters.text('{{numRaiders}}', boss)).toSucceedWith('');
    });

    test('formats cpRange correctly', () => {
        testOneFormat({
            format: '{{cpRange}}',
            giratinaAF: '1848-1931',
            klink: '502-546',
        });
    });

    test('formats boostedCpRange correctly', () => {
        testOneFormat({
            format: '{{boostedCpRange}}',
            giratinaAF: '2310-2414',
            klink: '',
        });
    });

    test('formats types correctly', () => {
        testOneFormat({
            format: '{{types}}',
            giratinaAF: 'ghost, dragon',
            klink: '',
        });
    });

    test('formats isActive correctly', () => {
        testOneFormat({
            format: '{{isActive}}',
            giratinaAF: 'inactive',
            klink: 'active',
        });
    });

    test('formats activeDates correctly', () => {
        testOneFormat({
            format: '{{activeDates}}',
            giratinaAF: '',
            klink: '',
        });
    });

    test('formats status correctly', () => {
        testOneFormat({
            format: '{{status}}',
            giratinaAF: 'inactive',
            klink: 'active',
        });
    });

    test('formats details correctly', () => {
        testOneFormat({
            format: '{{details}}',
            giratinaAF: {
                text: [
                    'T5 Giratina',
                    '  aka:               Giratina Altered Forme',
                    '  status:            inactive',
                    '  pokedex #:         487',
                    '  types:             ghost, dragon',
                    '  CP range:          1848-1931',
                    '  Boosted CP range:  2310-2414',
                    '  raid guide:        https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
                    '  image:             http://www.didjaredo.com/pogo/images/32x32/T5.png',
                ].join('\n'),
                markdown: [
                    'T5 Giratina',
                    '  aka:               Giratina Altered Forme',
                    '  status:            inactive',
                    '  pokedex #:         487',
                    '  types:             ghost, dragon',
                    '  CP range:          1848-1931',
                    '  Boosted CP range:  2310-2414',
                    '  raid guide:        https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
                    '  image:             http://www.didjaredo.com/pogo/images/32x32/T5.png',
                ].join('\n'),
                embed: [
                    '[T5 Giratina](https://www.pokebattler.com/raids/GIRATINAALTEREDFORME)',
                    '  aka:               Giratina Altered Forme',
                    '  status:            inactive',
                    '  pokedex #:         487',
                    '  types:             ghost, dragon',
                    '  CP range:          1848-1931',
                    '  Boosted CP range:  2310-2414',
                    '  raid guide:        [GIRATINAALTEREDFORME](https://www.pokebattler.com/raids/GIRATINAALTEREDFORME)',
                    '  image:             [T5.png](http://www.didjaredo.com/pogo/images/32x32/T5.png)',
                ].join('\n'),
            },
            klink: {
                text: [
                    'T1 Klink',
                    '  status:            active',
                    '  CP range:          502-546',
                    '  raid guide:        https://www.pokebattler.com/raids/KLINK',
                    '  image:             http://www.didjaredo.com/pogo/images/32x32/T1.png',
                ].join('\n'),
                markdown: [
                    'T1 Klink',
                    '  status:            active',
                    '  CP range:          502-546',
                    '  raid guide:        https://www.pokebattler.com/raids/KLINK',
                    '  image:             http://www.didjaredo.com/pogo/images/32x32/T1.png',
                ].join('\n'),
                embed: [
                    '[T1 Klink](https://www.pokebattler.com/raids/KLINK)',
                    '  status:            active',
                    '  CP range:          502-546',
                    '  raid guide:        [KLINK](https://www.pokebattler.com/raids/KLINK)',
                    '  image:             [T1.png](http://www.didjaredo.com/pogo/images/32x32/T1.png)',
                ].join('\n'),
            },
        });
    });

    describe('active properties', () => {
        test('format correctly for an active boss with endless active range', () => {
            const pastStart = moment().subtract(1, 'days');
            const pastStartText = pastStart.format('YYYY-MM-DD h:mm A');
            const boss = new Boss({
                name: 'Boss',
                tier: 5,
                active: new DateRange(pastStart.toDate()),
            });
            expect(bossFormatters.text('{{isActive}}', boss))
                .toSucceedWith('active');
            expect(bossFormatters.text('{{activeDates}}', boss))
                .toSucceedWith(`${pastStartText}-`);
            expect(bossFormatters.text('{{status}}', boss))
                .toSucceedWith(`active since ${pastStartText}`);
        });

        test('format correctly for an active boss with startless active range', () => {
            const futureEnd = moment().add(1, 'days');
            const futureEndText = futureEnd.format('YYYY-MM-DD h:mm A');
            const boss = new Boss({
                name: 'Boss',
                tier: 5,
                active: new DateRange(undefined, futureEnd.toDate()),
            });
            expect(bossFormatters.text('{{isActive}}', boss))
                .toSucceedWith('active');
            expect(bossFormatters.text('{{activeDates}}', boss))
                .toSucceedWith(`-${futureEndText}`);
            expect(bossFormatters.text('{{status}}', boss))
                .toSucceedWith(`active until ${futureEndText}`);
        });

        test('format correctly for an active boss with unbounded active range', () => {
            const boss = new Boss({
                name: 'Boss',
                tier: 5,
                active: new DateRange(undefined, undefined),
            });
            expect(bossFormatters.text('{{isActive}}', boss))
                .toSucceedWith('active');
            expect(bossFormatters.text('{{activeDates}}', boss))
                .toSucceedWith('');
            expect(bossFormatters.text('{{status}}', boss))
                .toSucceedWith('active');
        });

        test('format correctly for an active boss with bounded range', () => {
            const pastStart = moment().subtract(1, 'days');
            const pastStartText = pastStart.format('YYYY-MM-DD h:mm A');
            const futureEnd = moment().add(1, 'days');
            const futureEndText = futureEnd.format('YYYY-MM-DD h:mm A');
            const boss = new Boss({
                name: 'Boss',
                tier: 5,
                active: new DateRange(pastStart.toDate(), futureEnd.toDate()),
            });
            expect(bossFormatters.text('{{isActive}}', boss))
                .toSucceedWith('active');
            expect(bossFormatters.text('{{activeDates}}', boss))
                .toSucceedWith(`${pastStartText}-${futureEndText}`);
            expect(bossFormatters.text('{{status}}', boss))
                .toSucceedWith(`active until ${futureEndText}`);
        });

        test('format correctly for an inactive boss with an open-ended range in the future', () => {
            const futureStart = moment().add(1, 'days');
            const futureStartText = futureStart.format('YYYY-MM-DD h:mm A');
            const boss = new Boss({
                name: 'Boss',
                tier: 5,
                active: new DateRange(futureStart.toDate()),
            });
            expect(bossFormatters.text('{{isActive}}', boss))
                .toSucceedWith('inactive');
            expect(bossFormatters.text('{{activeDates}}', boss))
                .toSucceedWith(`${futureStartText}-`);
            expect(bossFormatters.text('{{status}}', boss))
                .toSucceedWith(`inactive until ${futureStartText}`);
        });

        test('format correctly for an inactive boss with an open-ended range in the past', () => {
            const pastEnd = moment().subtract(1, 'days');
            const pastEndText = pastEnd.format('YYYY-MM-DD h:mm A');
            const boss = new Boss({
                name: 'Boss',
                tier: 5,
                active: new DateRange(undefined, pastEnd.toDate()),
            });
            expect(bossFormatters.text('{{isActive}}', boss))
                .toSucceedWith('inactive');
            expect(bossFormatters.text('{{activeDates}}', boss))
                .toSucceedWith(`-${pastEndText}`);
            expect(bossFormatters.text('{{status}}', boss))
                .toSucceedWith(`inactive since ${pastEndText}`);
        });
    });

    describe('bossesFormatter', () => {
        const bosses: Boss[] = [
            new Boss({
                name: 'First Boss',
                tier: 5,
                active: true,
            }),
            new Boss({
                name: 'Second Boss',
                alternateNames: ['Boss the Second', 'Number 2 Boss'],
                tier: 4,
                active: true,
            }),
        ];

        test('concatenates results from each boss separated by newlines', () => {
            expect(bossesFormatters.text('{{name}}', bosses)).toSucceedWith([
                'First Boss',
                'Second Boss',
            ].join('\n'));
        });

        test('uses the text, markdown or embed formatter for each boss as appropriate', () => {
            expect(bossesFormatters.text('{{raidGuide}}', bosses)).toSucceedWith([
                'https://www.pokebattler.com/raids/FIRSTBOSS',
                'https://www.pokebattler.com/raids/SECONDBOSS',
            ].join('\n'));

            expect(bossesFormatters.markdown('{{raidGuide}}', bosses)).toSucceedWith([
                'https://www.pokebattler.com/raids/FIRSTBOSS',
                'https://www.pokebattler.com/raids/SECONDBOSS',
            ].join('\n'));

            expect(bossesFormatters.embed('{{raidGuide}}', bosses)).toSucceedWith([
                '[FIRSTBOSS](https://www.pokebattler.com/raids/FIRSTBOSS)',
                '[SECONDBOSS](https://www.pokebattler.com/raids/SECONDBOSS)',
            ].join('\n'));
        });
    });
});

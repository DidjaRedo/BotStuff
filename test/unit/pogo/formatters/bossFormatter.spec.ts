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
import { Boss } from '../../../../src/pogo/boss';
import { FormatTargets } from '../../../../src/utils/formatter';
import { TestRaidManager } from '../../../helpers/pogoHelpers';
import { bossFormatters } from '../../../../src/pogo/formatters/bossFormatter';

describe('Boss formatters', () => {
    type BossFormatResultByTarget = Record<FormatTargets, string>;

    type TestBosses = 'giratinaAF';
    type BossFormatTestBosses = Record<TestBosses, Boss>;

    type BossTestsByBoss<T> = Record<keyof T, string|BossFormatResultByTarget|undefined>;
    type BossFormatTestCase = { format: string } & BossTestsByBoss<BossFormatTestBosses>;

    const testTargets: FormatTargets[] = ['text', 'markdown', 'embed'];
    const testBossKeys: TestBosses[] = ['giratinaAF'];

    const { rm } = TestRaidManager.setup([]);
    const bosses = rm.bosses;

    const testBosses: BossFormatTestBosses = {
        giratinaAF: bosses.lookup('giratina altered forme').singleItem().getValueOrThrow(),
    };

    function getResultsByTarget(test: string|BossFormatResultByTarget|undefined): BossFormatResultByTarget {
        // this is a hack to allow 'expect.stringContaining' and 'expect.Matching'
        // ideally we'd add them to the signature explicitly but it looks like jest
        // doesn't export the intermediate types we'd need to do that
        if ((typeof test === 'string') || (test?.text === undefined)) {
            return {
                text: test as string,
                markdown: test as string,
                embed: test as string,
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

    it('should format name correctly', () => {
        testOneFormat({
            format: '{{name}}',
            giratinaAF: 'Giratina Altered Forme',
        });
    });

    it('should format displayName correctly', () => {
        testOneFormat({
            format: '{{displayName}}',
            giratinaAF: 'Giratina',
        });
    });

    it('should format alternateNames correctly', () => {
        testOneFormat({
            format: '{{alternateNames}}',
            giratinaAF: 'Giratina',
        });
    });

    it('should format otherNames correctly', () => {
        testOneFormat({
            format: '{{otherNames}}',
            giratinaAF: 'Giratina Altered Forme',
        });
    });

    it('should format tier correcty', () => {
        testOneFormat({
            format: '{{tier}}',
            giratinaAF: 'T5',
        });
    });

    it('should format description correcty', () => {
        testOneFormat({
            format: '{{description}}',
            giratinaAF: {
                text: 'T5 Giratina',
                markdown: 'T5 Giratina',
                embed: '[T5 Giratina](https://www.pokebattler.com/raids/GIRATINAALTEREDFORME)',
            },
        });
    });

    it('should format pokedexNumber correctly', () => {
        testOneFormat({
            format: '{{pokedexNumber}}',
            giratinaAF: '487',
        });
    });

    it('should format raidGuide correctly', () => {
        testOneFormat({
            format: '{{raidGuide}}',
            giratinaAF: {
                text: 'https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
                markdown: 'https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
                embed: '[GIRATINAALTEREDFORME](https://www.pokebattler.com/raids/GIRATINAALTEREDFORME)',
            },
        });
    });

    it('should format image correctly', () => {
        testOneFormat({
            format: '{{image}}',
            giratinaAF: {
                text: 'http://www.didjaredo.com/pogo/images/32x32/T5.png',
                markdown: 'http://www.didjaredo.com/pogo/images/32x32/T5.png',
                embed: '[T5.png](http://www.didjaredo.com/pogo/images/32x32/T5.png)',
            },
        });
    });

    it('should format raidGuideUrl correctly', () => {
        testOneFormat({
            format: '{{raidGuideUrl}}',
            giratinaAF: 'https://www.pokebattler.com/raids/GIRATINAALTEREDFORME',
        });
    });

    it('should format imageUrl correctly', () => {
        testOneFormat({
            format: '{{imageUrl}}',
            giratinaAF: 'http://www.didjaredo.com/pogo/images/32x32/T5.png',
        });
    });

    it('should format numRaiders correctly', () => {
        testOneFormat({
            format: '{{numRaiders}}',
            giratinaAF: '2',
        });
    });

    it('should format cpRange correctly', () => {
        testOneFormat({
            format: '{{cpRange}}',
            giratinaAF: '1848-1931',
        });
    });

    it('should format boostedCpRange correctly', () => {
        testOneFormat({
            format: '{{boostedCpRange}}',
            giratinaAF: '2310-2414',
        });
    });

    it('should format types correctly', () => {
        testOneFormat({
            format: '{{types}}',
            giratinaAF: 'ghost, dragon',
        });
    });

    it('should format isActive correctly', () => {
        testOneFormat({
            format: '{{isActive}}',
            giratinaAF: 'inactive',
        });
    });

    it('should format activeDates correctly', () => {
        testOneFormat({
            format: '{{activeDates}}',
            giratinaAF: '',
        });
    });

    it('should format status correctly', () => {
        testOneFormat({
            format: '{{status}}',
            giratinaAF: 'inactive',
        });
    });

    it('should format details correctly', () => {
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
        });
    });
});

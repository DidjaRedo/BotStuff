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
import { FormatTargets, FormattersByTarget, populateObject } from '@fgv/ts-utils';

export type FormatTestItems<TK extends string, TI> = Record<TK, TI>;

export type FormatTestResultByTarget = Record<FormatTargets, string>;
export type ItemFormatTestResult = string|FormatTestResultByTarget|undefined;
export type FormatTestResultsByItem<TK extends string> = Record<TK, ItemFormatTestResult>;
export type FormatTestCase<TK extends string> = { format: string } & FormatTestResultsByItem<TK>;

const testTargets: FormatTargets[] = ['text', 'markdown', 'embed'];

function getExpectedResultsByTarget(test: string|FormatTestResultByTarget|undefined): FormatTestResultByTarget {
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

export function testOneFormat<TK extends string, TI>(
    testCase: FormatTestCase<TK>,
    testItems: FormatTestItems<TK, TI>,
    testFormatters: FormattersByTarget<TI>,
) : void {
    const keys: TK[] = Object.keys(testCase).filter((k): k is TK => k !== 'format');
    const format = testCase.format;
    for (const key of keys) {
        const expected = getExpectedResultsByTarget(testCase[key]);
        const item = testItems[key];
        for (const target of testTargets) {
            const formatter = testFormatters[target];
            expect(formatter(format, item)).toSucceedWith(expected[target]);
        }
    }
}

function formatOneItem<TI>(
    format: string,
    item: TI,
    testFormatters: FormattersByTarget<TI>,
): ItemFormatTestResult {
    const full = populateObject<FormatTestResultByTarget>({
        text: () => testFormatters.text(format, item),
        markdown: () => testFormatters.markdown(format, item),
        embed: () => testFormatters.embed(format, item),
    }).getValueOrThrow();

    if ((full.text === full.markdown) && (full.markdown === full.embed)) {
        return full.text;
    }
    return full;
}

export function evaluateTestCase<TK extends string, TI>(
    format: string,
    testItems: FormatTestItems<TK, TI>,
    testFormatters: FormattersByTarget<TI>,
) : Partial<FormatTestResultsByItem<TK>> {
    const keys: TK[] = Object.keys(testItems) as TK[];
    const result: Partial<FormatTestResultsByItem<TK>> = {};
    for (const key of keys) {
        result[key] = formatOneItem(format, testItems[key], testFormatters);
    }
    return result;
}

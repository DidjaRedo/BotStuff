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

import * as TimeConverters from '../../../src/time/timeConverters';

describe('TimeConverters module', () => {
    describe('date converter', () => {
        it('should convert a date from milliseconds as a number', () => {
            const now = new Date();
            const conversion = TimeConverters.date.convert(now.getTime());
            expect(conversion.isSuccess()).toBe(true);
            if (conversion.isSuccess()) {
                expect(conversion.value).toEqual(now);
            }
        });

        it('should convert a date from a well formatted string', () => {
            const now = new Date();
            const conversion = TimeConverters.date.convert(now.toISOString());
            expect(conversion.isSuccess()).toBe(true);
            if (conversion.isSuccess()) {
                expect(conversion.value).toEqual(now);
            }
        });

        it('should just return a date', () => {
            const now = new Date();
            const conversion = TimeConverters.date.convert(now);
            expect(conversion.isSuccess()).toBe(true);
            if (conversion.isSuccess()) {
                expect(conversion.value).toBe(now);
            }
        });

        it('should fail for a invalid input', () => {
            [
                true,
                'not a date',
            ].forEach((t) => {
                const conversion = TimeConverters.date.convert(t);
                expect(conversion.isFailure()).toBe(true);
                if (conversion.isFailure()) {
                    expect(conversion.message).toMatch(/invalid date specification/i);
                }
            });
        });
    });

    describe('dateRange converter', () => {
        const start = new Date(Date.now() - 10000);
        const end = new Date(Date.now() + 10000);
        it('should convert a range with valid or omitted min and max specificatons', () => {
            const expected = [
                { start, end, min: start, max: end },
                { start, min: start },
                { end, max: end },
                {},
            ];
            const toConvert = expected.map((x) => {
                const result: { start?: unknown, end?: unknown } = {};
                if (x.start !== undefined) {
                    result.start = x.start.getTime();
                }
                if (x.end !== undefined) {
                    result.end = x.end.toISOString();
                }
                return result;
            });

            for (let i = 0; i < toConvert.length; i++) {
                const conversion = TimeConverters.dateRange.convert(toConvert[i]);
                expect(conversion.isSuccess()).toBe(true);
                if (conversion.isSuccess()) {
                    expect(conversion.value).toEqual(expect.objectContaining(expected[i]));
                }
            }
        });


        it('should convert a string range with valid or omitted min and max specificatons', () => {
            const expected = [
                { start, end, min: start, max: end },
                { start, min: start },
                { end, max: end },
            ];

            const toConvert = expected.map((x) => {
                if (x.start && x.end) {
                    return `${x.start.toISOString()}..${x.end.toISOString()}`;
                }
                else if (x.start) {
                    return `${x.start.toISOString()}..`;
                }
                return `..${x.end.toISOString()}`;
            });

            for (let i = 0; i < toConvert.length; i++) {
                const conversion = TimeConverters.dateRange.convert(toConvert[i]);
                expect(conversion.isSuccess()).toBe(true);
                if (conversion.isSuccess()) {
                    expect(conversion.value).toEqual(expect.objectContaining(expected[i]));
                }
            }
        });
        it('should convert and ignore extra fields', () => {
            const expected = { start, end };
            const conversion = TimeConverters.dateRange.convert({
                start, end, extra: 'whatever',
            });
            expect(conversion.isSuccess()).toBe(true);
            if (conversion.isSuccess()) {
                expect(conversion.value).toEqual(
                    expect.objectContaining(expected),
                );
            }
        });

        it('should fail if either min or max is invalid', () => {
            const bad = [
                { start: 'not a date' },
                { start, end: true },
            ];
            for (const t of bad) {
                const conversion = TimeConverters.dateRange.convert(t);
                expect(conversion.isFailure()).toBe(true);
                if (conversion.isFailure()) {
                    expect(conversion.message).toMatch(/invalid date/i);
                }
            }
        });

        it('should fail if the range is inverted', () => {
            const bad = { start: end, end: start };
            const conversion = TimeConverters.dateRange.convert(bad);
            expect(conversion.isFailure()).toBe(true);
            if (conversion.isFailure()) {
                expect(conversion.message).toMatch(/inverted/i);
            }
        });

        it('should fail for a malformed string', () => {
            [
                'bad string',
            ].forEach((s) => {
                const conversion = TimeConverters.dateRange.convert(s);
                expect(conversion.isFailure()).toBe(true);
                if (conversion.isFailure()) {
                    expect(conversion.message).toMatch(/cannot convert/i);
                }
            });
        });
    });
});

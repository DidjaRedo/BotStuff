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
import * as TimeConverters from '../../../src/time/timeConverters';
import moment from 'moment';

describe('TimeConverters module', () => {
    describe('date converter', () => {
        test('converts a date from milliseconds as a number', () => {
            const now = new Date();
            const conversion = TimeConverters.date.convert(now.getTime());
            expect(conversion.isSuccess()).toBe(true);
            if (conversion.isSuccess()) {
                expect(conversion.value).toEqual(now);
            }
        });

        test('converts a date from a well formatted string', () => {
            const now = new Date();
            const conversion = TimeConverters.date.convert(now.toISOString());
            expect(conversion.isSuccess()).toBe(true);
            if (conversion.isSuccess()) {
                expect(conversion.value).toEqual(now);
            }
        });

        test('just returns a date', () => {
            const now = new Date();
            const conversion = TimeConverters.date.convert(now);
            expect(conversion.isSuccess()).toBe(true);
            if (conversion.isSuccess()) {
                expect(conversion.value).toBe(now);
            }
        });

        test('fails for a invalid input', () => {
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

    describe('flexTime converter', () => {
        test('converts valid absolute times', () => {
            [
                { src: '0608', hours: 6, minutes: 8 },
                { src: '1310', hours: 13, minutes: 10 },
                { src: '605pm', hours: 18, minutes: 5 },
            ].forEach((test) => {
                expect(TimeConverters.flexTime.convert(test.src)).toSucceedAndSatisfy((d: Date) => {
                    expect(moment(d).hours()).toBe(test.hours);
                    expect(moment(d).minutes()).toBe(test.minutes);
                });
            });
        });

        test('converts relative times', () => {
            const future = moment().add(10, 'minutes');
            const futureSpec = future.format('hmm');
            expect(TimeConverters.flexTime.convert(futureSpec)).toSucceedAndSatisfy((d: Date) => {
                expect(moment(d).hours()).toBe(future.hours());
                expect(moment(d).minutes()).toBe(future.minutes());
            });

            const past = moment().subtract(10, 'minutes');
            const pastSpec = past.format('hmm');
            expect(TimeConverters.flexTime.convert(pastSpec)).toSucceedAndSatisfy((d: Date) => {
                expect(moment(d).hours()).toBe((past.hours() + 12) % 24);
                expect(moment(d).minutes()).toBe(past.minutes());
            });
        });

        test('fails to convert an invalid time specification', () => {
            [
                '12345',
                () => '12345',
            ].forEach((test) => {
                expect(TimeConverters.flexTime.convert(test)).toFailWith(/invalid time/i);
            });
        });
    });

    describe('dateRange converter', () => {
        const start = new Date(Date.now() - 10000);
        const end = new Date(Date.now() + 10000);
        test('converts a range with valid or omitted min and max specificatons', () => {
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


        test('converts a string range with valid or omitted min and max specificatons', () => {
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
        test('converts and ignore extra fields', () => {
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

        test('fails if either min or max is invalid', () => {
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

        test('fails if the range is inverted', () => {
            const bad = { start: end, end: start };
            const conversion = TimeConverters.dateRange.convert(bad);
            expect(conversion.isFailure()).toBe(true);
            if (conversion.isFailure()) {
                expect(conversion.message).toMatch(/inverted/i);
            }
        });

        test('fails for a malformed string', () => {
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

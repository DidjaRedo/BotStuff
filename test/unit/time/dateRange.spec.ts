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

import { DateRange } from '../../../src/time/dateRange';
import { Result } from '../../../src/utils/result';
import moment from 'moment';

describe('DateRange class', () => {
    describe('constructor', () => {
        it('should throw if start is greater than end', () => {
            const now = Date.now();
            const start = new Date(now + 100000);
            const end = new Date(now - 10000);
            expect(() => {
                return new DateRange(start, end);
            }).toThrowError(/inverted range/i);
        });
    });

    describe('createDateRange static method', () => {
        it('should fail if end is greater than end', () => {
            const now = Date.now();
            const start = new Date(now + 100000);
            const end = new Date(now - 10000);
            let result: Result<DateRange>|undefined;
            expect(() => {
                result = DateRange.createDateRange({ start, end });
            }).not.toThrow();
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/inverted range/i);
            }
        });
    });

    describe('start and end properties', () =>{
        it('should alias min and max', () => {
            const now = Date.now();
            const start = new Date(now - 100000);
            const end = new Date(now + 10000);
            const range = new DateRange(start, end);
            expect(range.start).toBe(range.min);
            expect(range.end).toBe(range.max);
        });
    });

    describe('includes method', () => {
        it('should succeed for an empty range', () => {
            const now = Date.now();
            const range = new DateRange();
            expect(range.includes(new Date(now))).toBe(true);
        });

        it('should succeed for a date equal to or later than the start of an endless range', () => {
            const now = Date.now();
            const start = new Date(now - 100000);
            const end = undefined;
            const range = new DateRange(start, end);
            expect(range.includes(start)).toBe(true);
            expect(range.includes(new Date(now + 100000000))).toBe(true);
        });

        it('should succeed for a date before the end of an startless range', () => {
            const now = Date.now();
            const start = undefined;
            const end = new Date(now + 10000);
            const range = new DateRange(start, end);
            expect(range.includes(new Date(now))).toBe(true);
            expect(range.includes(new Date(end.getTime() - 1))).toBe(true);
            expect(range.includes(end)).toBe(false);
        });

        it('should succeed for a date within the range start <= val < end', () => {
            const now = Date.now();
            const start = new Date(now - 100000);
            const end = new Date(now + 10000);
            const range = new DateRange(start, end);
            expect(range.includes(start)).toBe(true);
            expect(range.includes(new Date(now))).toBe(true);
            expect(range.includes(new Date(end.getTime() - 1))).toBe(true);
            expect(range.includes(end)).toBe(false);
        });

        it('should fail for a date before the start of an endless range', () => {
            const now = Date.now();
            const start = new Date(now);
            const end = undefined;
            const range = new DateRange(start, end);
            expect(range.includes(new Date(now - 100000))).toBe(false);
        });

        it('should fail for a date after the end of a startless range', () => {
            const now = Date.now();
            const start = undefined;
            const end = new Date(now);
            const range = new DateRange(start, end);
            expect(range.includes(new Date(now + 100000))).toBe(false);
        });

        it('should fail for a date outside of a range', () => {
            const now = Date.now();
            const start = new Date(now - 100000);
            const end = new Date(now + 10000);
            const range = new DateRange(start, end);
            expect(range.includes(new Date(now - 200000))).toBe(false);
            expect(range.includes(new Date(now + 200000))).toBe(false);
        });
    });

    describe('duration method', () => {
        const start = moment();
        const end = start.clone().add(90, 'minutes');
        const range = new DateRange(start.toDate(), end.toDate());
        it('should report the duration of the range in minutes by default', () => {
            expect(range.duration()).toBe(90);
        });

        it('should report the duration in other units if specified', () => {
            expect(range.duration('hours')).toBe(1);
            expect(range.duration('seconds')).toBe(90 * 60);
        });

        it('should return undefined if either start or end is undefined', () => {
            expect(new DateRange(new Date()).duration()).toBeUndefined();
            expect(new DateRange(undefined, new Date()).duration()).toBeUndefined();
        });
    });

    describe('timeSince and timeUntil methods', () => {
        const duration = 60;
        const start = moment().subtract(2 * duration, 'minutes');
        const mid = start.clone().add(duration / 2, 'minutes');
        const end = start.clone().add(duration, 'minutes');
        const range = new DateRange(start.toDate(), end.toDate());
        it('should return the time in minutes by default', () => {
            expect(range.timeSince('start', mid.toDate())).toBe(duration / 2);
            expect(range.timeSince('end', mid.toDate())).toBe(-duration / 2);
            expect(range.timeUntil('start', mid.toDate())).toBe(-duration / 2);
            expect(range.timeUntil('end', mid.toDate())).toBe(duration / 2);
        });

        it('should return undefined if the end of the range to be measured is undefined', () => {
            const startless = new DateRange(undefined, new Date());
            const endless = new DateRange(new Date(), undefined);

            expect(startless.timeSince('start', new Date())).toBeUndefined();
            expect(startless.timeSince('end', new Date())).not.toBeUndefined();
            expect(startless.timeUntil('start', new Date())).toBeUndefined();
            expect(startless.timeUntil('end', new Date())).not.toBeUndefined();

            expect(endless.timeSince('start', new Date())).not.toBeUndefined();
            expect(endless.timeSince('end', new Date())).toBeUndefined();
            expect(endless.timeUntil('start', new Date())).not.toBeUndefined();
            expect(endless.timeUntil('end', new Date())).toBeUndefined();
        });
    });

    describe('timeFromNowSince and timeFromNowUntil methods', () => {
        const duration = 60;
        const start = moment().subtract(duration / 2, 'minutes');
        const end = start.clone().add(duration, 'minutes');
        const range = new DateRange(start.toDate(), end.toDate());
        it('should return the time relative to now in minutes by default', () => {
            // +/-1 for the end tests because 'now' keeps moving and the methods
            // truncate
            expect(range.timeFromNowSince('start')).toBe(duration / 2);
            expect(range.timeFromNowSince('end')).toBe((-duration / 2) + 1);
            expect(range.timeFromNowUntil('start')).toBe(-duration / 2);
            expect(range.timeFromNowUntil('end')).toBe((duration / 2) - 1);
        });
    });
});

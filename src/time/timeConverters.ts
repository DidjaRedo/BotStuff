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

import * as Converters from '../utils/converters';
import { DateRange, DateRangeProperties } from './dateRange';
import { Result, fail, succeed } from '../utils/result';
import { Converter } from '../utils/converter';
import moment from 'moment';

(moment as unknown as { suppressDeprecationWarnings: boolean }).suppressDeprecationWarnings = true;

export const date = new Converter<Date>((from: unknown): Result<Date> => {
    if (typeof from === 'number') {
        return succeed(new Date(from));
    }
    else if (typeof from === 'string') {
        const parsed = moment(from);
        if (parsed.isValid()) {
            return succeed(parsed.toDate());
        }
    }
    else if (from instanceof Date) {
        return succeed(from);
    }
    return fail(`Invalid date specification ${JSON.stringify(from)}`);
});

const dateRangePropertiesFromObject = Converters.object<DateRangeProperties>({
    start: date,
    end: date,
}, ['start', 'end']);

export const dateRangeFromObject = new Converter<DateRange>((from: unknown) => {
    const result = dateRangePropertiesFromObject.convert(from);
    if (result.isSuccess()) {
        return DateRange.createDateRange(result.value);
    }
    return fail(result.message);
});

export const dateRange = new Converter((from: unknown): Result<DateRange> => {
    if (typeof from === 'string') {
        const parts = from.split('..');
        if (parts.length === 2) {
            const range: { start?: string, end?: string } = {};
            if (parts[0].trim().length > 0) {
                range.start = parts[0];
            }
            if (parts[1].trim().length > 0) {
                range.end = parts[1];
            }
            from = range;
        }
    }
    return dateRangeFromObject.convert(from);
});


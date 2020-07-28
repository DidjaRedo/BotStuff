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

import {
    RangeOf,
    RangeOfProperties,
    Result,
    captureResult,
    fail,
    succeed,
} from '@fgv/ts-utils';
import moment from 'moment';

export interface DateRangeProperties extends RangeOfProperties<Date> {
    readonly start?: Date;
    readonly end?: Date;
}

export interface ExplicitDateRange extends RangeOf<Date>, DateRangeProperties {
    start: Date;
    end: Date;
    isExplicit(): this is ExplicitDateRange;
    validateIsExplicit(): Result<ExplicitDateRange>;
    duration(units?: moment.unitOfTime.Diff): number;
    timeSince(prop: keyof DateRangeProperties, date: Date, units?: moment.unitOfTime.Diff): number;
    timeUntil(prop: keyof DateRangeProperties, date: Date, units?: moment.unitOfTime.Diff): number;
    timeFromNowSince(prop: keyof DateRangeProperties, units?: moment.unitOfTime.Diff): number;
    timeFromNowUntil(prop: keyof DateRangeProperties, units?: moment.unitOfTime.Diff): number;
}

export class DateRange extends RangeOf<Date> implements DateRangeProperties {
    public constructor(start?: Date, end?: Date) {
        super(start, end);
    }

    public static createDateRange(init: DateRangeProperties): Result<DateRange> {
        return captureResult(() => new DateRange(init.start, init.end));
    }

    public static createExplicitDateRange(init: DateRangeProperties): Result<ExplicitDateRange> {
        return DateRange.createDateRange(init).onSuccess((range) => range.validateIsExplicit());
    }

    public static compareDates(d1: Date, d2: Date): 'less'|'equal'|'greater' {
        return RangeOf._defaultCompare(d1.getTime(), d2.getTime());
    }

    public get start(): Date|undefined { return this.min; }
    public get end(): Date|undefined { return this.max; }

    public isExplicit(): this is ExplicitDateRange {
        return ((this.min !== undefined) && (this.max !== undefined));
    }

    public validateIsExplicit(): Result<ExplicitDateRange> {
        if (this.isExplicit()) {
            return succeed(this);
        }
        return fail('Explicit date range must have both start and end.');
    }

    public duration(units: moment.unitOfTime.Diff = 'minutes'): number|undefined {
        if ((this.min === undefined) || (this.max === undefined)) {
            return undefined;
        }

        return moment(this.max).diff(moment(this.min), units);
    }

    public timeSince(prop: keyof DateRangeProperties, date: Date, units: moment.unitOfTime.Diff = 'minutes'): number|undefined {
        if (this[prop] === undefined) {
            return undefined;
        }
        return moment(date).diff(moment(this[prop]), units);
    }

    public timeUntil(prop: keyof DateRangeProperties, date: Date, units: moment.unitOfTime.Diff = 'minutes'): number|undefined {
        if (this[prop] === undefined) {
            return undefined;
        }
        return moment(this[prop]).diff(moment(date), units);
    }

    public timeFromNowSince(prop: keyof DateRangeProperties, units: moment.unitOfTime.Diff = 'minutes'): number|undefined {
        return this.timeSince(prop, new Date(), units);
    }

    public timeFromNowUntil(prop: keyof DateRangeProperties, units: moment.unitOfTime.Diff = 'minutes'): number|undefined {
        return this.timeUntil(prop, new Date(), units);
    }

    protected _compare(d1: Date, d2: Date): 'less'|'equal'|'greater' {
        return DateRange.compareDates(d1, d2);
    }
}

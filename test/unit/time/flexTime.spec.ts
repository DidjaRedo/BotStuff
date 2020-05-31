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
import FlexTime from '../../../src/time/flexTime';

function makeAmbiguousTimeString(date: Date): string {
    let hours = (date.getHours() % 12);
    hours = ((hours === 0) ? 12 : hours);
    const minutes = date.toTimeString().slice(3, 5);
    return hours + minutes;
}

interface UnambiguousParseTest {
    string: string;
    hour: number;
    minutes: number;
};

describe('flexTime', function (): void {
    describe('constructor', (): void => {
        const morning = new Date(2018, 1, 1, 6, 10);
        const evening = new Date(2018, 1, 1, 18, 10);

        it('should parse unambiguous 12- or 24-hour times without regard for time of day', (): void => {
            [
                { string: '0000', hour: 0, minutes: 0 },
                { string: '0100', hour: 1, minutes: 0 },
                { string: '0600', hour: 6, minutes: 0 },
                { string: '0615', hour: 6, minutes: 15 },
                { string: '1312', hour: 13, minutes: 12 },
                { string: '13:12', hour: 13, minutes: 12 },
                { string: '23:59', hour: 23, minutes: 59 },
                { string: '800 am', hour: 8, minutes: 0 },
                { string: '8:00 pm', hour: 20, minutes: 0 },
                { string: '101 am', hour: 1, minutes: 1 },
                { string: '11:11p', hour: 23, minutes: 11 },
                { string: '1212a', hour: 0, minutes: 12 },
                { string: '12:12 PM', hour: 12, minutes: 12 },
            ].forEach(function (test: UnambiguousParseTest): void {
                let time = new FlexTime(test.string, morning);
                expect(time.getHours()).toBe(test.hour);
                expect(time.getMinutes()).toBe(test.minutes);
                expect(time.hours).toBe(test.hour);
                expect(time.minutes).toBe(test.minutes);

                time = new FlexTime(test.string, evening);
                expect(time.getHours()).toBe(test.hour);
                expect(time.getMinutes()).toBe(test.minutes);
                expect(time.hours).toBe(test.hour);
                expect(time.minutes).toBe(test.minutes);
            });
        });

        it('should adjust ambiguous times depending on time of day', (): void => {
            interface AmbiguousParseTest {
                string: string;
                morning: number;
                evening: number;
                minutes: number;
            };

            [
                { string: '100', morning: 13, evening: 1, minutes: 0 },
                { string: '605', morning: 18, evening: 6, minutes: 5 },
                { string: '615', morning: 6, evening: 18, minutes: 15 },
                { string: '112', morning: 13, evening: 1, minutes: 12 },
                { string: '11:59', morning: 11, evening: 23, minutes: 59 },
                { string: '1215', morning: 12, evening: 0, minutes: 15 },
            ].forEach(function (test: AmbiguousParseTest): void {
                let time = new FlexTime(test.string, morning);
                expect(time.getHours()).toBe(test.morning);
                expect(time.getMinutes()).toBe(test.minutes);

                time = new FlexTime(test.string, evening);
                expect(time.getHours()).toBe(test.evening);
                expect(time.getMinutes()).toBe(test.minutes);
            });
        });

        it('should use the current time if no time is specified', (): void => {
            const thirtyMinutesInMilliseconds = 30 * 60 * 1000;
            const future = new Date(Date.now() + thirtyMinutesInMilliseconds);
            const past = new Date(Date.now() - thirtyMinutesInMilliseconds);

            let time = new FlexTime(makeAmbiguousTimeString(future));
            let expected = future.getHours();
            expect(time.getHours()).toBe(expected);

            time = new FlexTime(makeAmbiguousTimeString(past));
            expected = (past.getHours() + 12) % 24;
            expect(time.getHours()).toBe(expected);

            const date = new Date();
            time = new FlexTime();
            expect(time.getHours()).toBe(date.getHours());
            expect(time.getMinutes()).toBe(date.getMinutes());
        });

        it('should initialize from another flex time', (): void => {
            const time = new FlexTime(new Date(2018, 1, 1, 12, 0));
            const newTime = new FlexTime(time);
            expect(time.getHours()).toEqual(newTime.getHours());
            expect(time.getMinutes()).toEqual(newTime.getMinutes());
        });

        it('should initiialize from a Date object', (): void => {
            const date = new Date();
            const time = new FlexTime(date);
            expect(time.getHours()).toBe(date.getHours());
            expect(time.getMinutes()).toBe(date.getMinutes());
        });

        it('should initialize from an time in milliseconds', (): void => {
            const date = new Date();
            const time = new FlexTime(date.getTime());
            expect(time.getHours()).toBe(date.getHours());
            expect(time.getMinutes()).toBe(date.getMinutes());
        });

        it('should throw for invalid time strings', (): void => {
            [
                '12345', '12', 'fred', '2515', '875', '123:4', '8:00 ama', '2300 am',
            ].forEach(function (test): void {
                expect((): FlexTime => new FlexTime(test)).toThrowError(`Invalid time string "${test}".`);
            });
        });
    });

    describe('getFlexTime static method', (): void => {
        it('should use Date, time in milliseconds, or FlexTime and delta if supplied', (): void => {
            const now = new Date(2018, 1, 1, 11, 11, 11);
            const nowTime = now.getTime();
            [
                { string: '20', hour: 11, minutes: 31 },
                { string: '-20', hour: 10, minutes: 51 },
                { string: '60', hour: 12, minutes: 11 },
                { string: '120', hour: 13, minutes: 11 },
                { string: undefined, hour: 11, minutes: 11 },
            ].forEach(function (test: UnambiguousParseTest): void {
                let time = FlexTime.getFlexTime(now, test.string);
                expect(time.getHours()).toBe(test.hour);
                expect(time.getMinutes()).toBe(test.minutes);

                time = FlexTime.getFlexTime(nowTime, test.string);
                expect(time.getHours()).toBe(test.hour);
                expect(time.getMinutes()).toBe(test.minutes);

                time = FlexTime.getFlexTime(now);
                time = FlexTime.getFlexTime(time, test.string);
                expect(time.getHours()).toBe(test.hour);
                expect(time.getMinutes()).toBe(test.minutes);
            });
        });

        it('should use the current time if no time is supplied', function (): void {
            const flexNow = FlexTime.getFlexTime();
            const now = new Date();
            const dateFromFlex = new Date();
            dateFromFlex.setHours(flexNow.getHours());
            dateFromFlex.setMinutes(flexNow.getMinutes());
            // 5 seconds should be plenty of fudge.  This test might also fail
            // right at midnight if flexNow and now happen to land on different
            // days.
            const delta = dateFromFlex.getTime() - now.getTime();
            expect(delta).toBeLessThan(5000);
        });
    });

    describe('toDate method', (): void => {
        it('should return accept baseDate as a number or a date', (): void => {
            const baseDate = new Date(2018, 1, 1, 14, 0);
            const futureDate = new Date(baseDate.getTime() + 300 * 1000);
            const flex = new FlexTime('', futureDate);

            let dateFromFlex = flex.toDate(undefined, baseDate);
            expect(dateFromFlex.getUTCDate()).toEqual(baseDate.getUTCDate());

            dateFromFlex = flex.toDate(undefined, baseDate.getTime());
            expect(dateFromFlex.getUTCDate()).toEqual(baseDate.getUTCDate());
        });

        it("should return today's date for a time later than now", (): void => {
            const baseDate = new Date(2018, 1, 1, 14, 0);
            const futureDate = new Date(baseDate.getTime() + 300 * 1000);
            const flex = new FlexTime('', futureDate);
            const dateFromFlex = flex.toDate(undefined, baseDate);
            expect(dateFromFlex.getUTCDate()).toEqual(baseDate.getUTCDate());
        });

        it("should return tomorrow's date for a time more than 12 hours later than now", (): void => {
            const baseDate = new Date(2018, 1, 1, 14, 0);
            const futureDate = new Date(baseDate.getTime() + (13 * 60 * 60 * 1000));
            const flex = new FlexTime('', futureDate);
            const dateFromFlex = flex.toDate(undefined, baseDate);
            expect(dateFromFlex.getUTCDate()).not.toEqual(baseDate.getUTCDate());
        });

        it("should return tomorrow's date for a time earlier than now", (): void => {
            const baseDate = new Date(2018, 1, 1, 14, 0);
            const pastDate = new Date(baseDate.getTime() - 300 * 1000);
            const flex = new FlexTime('', pastDate);
            const dateFromFlex = flex.toDate(undefined, baseDate);
            expect(dateFromFlex.getUTCDate()).not.toEqual(baseDate.getUTCDate());
        });

        it('should apply a fudge factor if supplied', (): void => {
            const baseDate = new Date(2018, 1, 1, 14, 0);
            const pastDate = new Date(baseDate.getTime() - 300 * 1000);
            const flex = new FlexTime('', pastDate);
            const dateFromFlex = flex.toDate(10, baseDate);
            expect(dateFromFlex.getUTCDate()).toEqual(baseDate.getUTCDate());
        });

        it('should use now if no base date is supplied', (): void => {
            const futureDate = new Date(Date.now() + 300 * 1000);
            const pastDate = new Date(Date.now() - 300 * 1000);
            const futureFlex = new FlexTime('', futureDate);
            const pastFlex = new FlexTime('', pastDate);
            const futureDateFromFlex = futureFlex.toDate();
            const pastDateFromFlex = pastFlex.toDate();
            const nowUTCDate = new Date().getUTCDate();
            expect(futureDateFromFlex.getUTCDate()).toEqual(nowUTCDate);
            expect(pastDateFromFlex.getUTCDate()).not.toEqual(nowUTCDate);
        });
    });

    describe('toString method', (): void => {
        it('should return properly formatted strings', (): void => {
            [
                ['0015', '00', '12', '15', 'am'],
                ['0620', '06', '06', '20', 'am'],
                ['0903', '09', '09', '03', 'am'],
                ['1230 pm', '12', '12', '30', 'pm'],
                ['2359', '23', '11', '59', 'pm'],
            ].forEach((test): void => {
                const time = new FlexTime(test[0]);
                let expected = `${test[1]}${test[3]}`;
                expect(time.toString('HHMM')).toBe(expected);
                expect(time.toString('HHmm')).toBe(expected);

                expected = `${test[1]}:${test[3]}`;
                expect(time.toString('HH:MM')).toBe(expected);
                expect(time.toString('HH:mm')).toBe(expected);

                expected = `${Number(test[2])}${test[3]} ${test[4].toLowerCase()}`;
                expect(time.toString('hhmm tt')).toBe(expected);
                expect(time.toString('hhMM tt')).toBe(expected);

                expected = `${Number(test[2])}${test[3]} ${test[4].toUpperCase()}`;
                expect(time.toString('hhmm TT')).toBe(expected);
                expect(time.toString('hhMM TT')).toBe(expected);

                expected = `${Number(test[2])}${test[3]}${test[4][0].toLowerCase()}`;
                expect(time.toString('hhmmt')).toBe(expected);
                expect(time.toString('hhMMt')).toBe(expected);

                expected = `${Number(test[2])}${test[3]}${test[4][0].toUpperCase()}`;
                expect(time.toString('hhmmT')).toBe(expected);
                expect(time.toString('hhMMT')).toBe(expected);
            });
        });

        it('should default to 12-hour lower case format', (): void => {
            [
                ['0015', '12:15 am'],
                ['0620', '6:20 am'],
                ['1230 pm', '12:30 pm'],
                ['2359', '11:59 pm'],
            ].forEach((test): void => {
                const time = new FlexTime(test[0]);
                expect(time.toString()).toBe(test[1]);
            });
        });
    });

    describe('getDeltaInMinutes', (): void => {
        it('should choose the nearest possible time', (): void => {
            [
                ['1130am', '1230pm', 60],
                ['2345', '0015', 30],
                ['1215pm', '1145am', -30],
                ['0030', '2330', -60],
                ['0601', '1759', 12 * 60 - 2],
            ].forEach((test): void => {
                const t1 = new FlexTime(test[0]);
                const t2 = new FlexTime(test[1]);
                expect(t1.getDeltaInMinutes(t2)).toBe(test[2]);
            });
        });
    });

    describe('getAbsoluteDeltaInMinutes', (): void => {
        it('should not choose the nearest possible time', (): void => {
            [
                ['1130am', '1230pm', 60],
                ['2345', '0015', -(23.5 * 60)],
                ['1215pm', '1145am', -30],
                ['0030', '2330', (23 * 60)],
                ['0601', '1759', 12 * 60 - 2],
            ].forEach((test): void => {
                const t1 = new FlexTime(test[0]);
                const t2 = new FlexTime(test[1]);
                expect(t1.getAbsoluteDeltaInMinutes(t2)).toBe(test[2]);
            });
        });
    });

    describe('formatTimeAmPm static method', (): void => {
        it('should format a FlexTime in morning or evening', (): void => {
            expect(FlexTime.formatTimeAmPm(new FlexTime('0800'))).toEqual('8:00 AM');
            expect(FlexTime.formatTimeAmPm(new FlexTime('2000'))).toEqual('8:00 PM');
        });

        it('should format a Date in morning or evening', (): void => {
            const morning = new FlexTime('0615').toDate();
            const evening = new FlexTime('2220').toDate();
            expect(FlexTime.formatTimeAmPm(morning)).toEqual('6:15 AM');
            expect(FlexTime.formatTimeAmPm(evening)).toEqual('10:20 PM');
        });

        it('should format ticks in morning or evening', (): void => {
            const morning = new FlexTime('0530').toDate().getTime();
            const evening = new FlexTime('2130').toDate().getTime();
            expect(FlexTime.formatTimeAmPm(morning)).toEqual('5:30 AM');
            expect(FlexTime.formatTimeAmPm(evening)).toEqual('9:30 PM');
        });

        it('should format noon and midnight as 12', (): void => {
            const morning = new FlexTime('0010').toDate().getTime();
            const evening = new FlexTime('1230p').toDate().getTime();
            expect(FlexTime.formatTimeAmPm(morning)).toEqual('12:10 AM');
            expect(FlexTime.formatTimeAmPm(evening)).toEqual('12:30 PM');
        });
    });

    describe('formatTime24Hours static method', (): void => {
        it('should format a FlexTime in morning or evening', (): void => {
            expect(FlexTime.formatTime24Hours(new FlexTime('900a'))).toEqual('0900');
            expect(FlexTime.formatTime24Hours(new FlexTime('900p'))).toEqual('2100');
        });

        it('should format a Date in morning or evening', (): void => {
            const morning = new FlexTime('701am').toDate();
            const evening = new FlexTime('1159pm').toDate();
            expect(FlexTime.formatTime24Hours(morning)).toEqual('0701');
            expect(FlexTime.formatTime24Hours(evening)).toEqual('2359');
        });

        it('should format ticks in morning or evening', (): void => {
            const morning = new FlexTime('12:34am').toDate().getTime();
            const evening = new FlexTime('12:34pm').toDate().getTime();
            expect(FlexTime.formatTime24Hours(morning)).toEqual('0034');
            expect(FlexTime.formatTime24Hours(evening)).toEqual('1234');
        });
    });

    describe('dateToUnixTimestamp static method', (): void => {
        it('should convert a date to a unix timestamp', (): void => {
            const date = new Date();
            const unix = Math.round(date.getTime() / 1000);
            expect(FlexTime.dateToUnixTimestamp(date)).toEqual(unix);
        });

        it('should return 0 for an undefined date', (): void => {
            expect(FlexTime.dateToUnixTimestamp(undefined)).toEqual(0);
        });
    });

    describe('getDeltaDate static method', (): void => {
        it('should get a later or earlier time', (): void => {
            const date = new Date();
            let minutes = 3;
            let expected = date.getTime() + (minutes * 60 * 1000);
            expect(FlexTime.getDeltaDate(date, minutes).getTime()).toBe(expected);

            minutes = -10;
            expected = date.getTime() + (minutes * 60 * 1000);
            expect(FlexTime.getDeltaDate(date, minutes).getTime()).toBe(expected);
        });
    });

    describe('getDeltaFromNow static method', (): void => {
        it('should get a later or earlier time', (): void => {
            const date = new Date();
            let minutes = 3;
            let expected = (date.getTime() + (minutes * 60 * 1000)) / 250;
            expect(FlexTime.getDeltaFromNow(minutes).getTime() / 250).toBeCloseTo(expected);

            minutes = -10;
            expected = (date.getTime() + (minutes * 60 * 1000)) / 250;
            expect(FlexTime.getDeltaFromNow(minutes).getTime() / 250).toBeCloseTo(expected);
        });
    });

    describe('getDeltaInMinutes static methoid', (): void => {
        it('should get the difference in minutes between two times', (): void => {
            const minutes = 5;
            const t1 = new FlexTime('0930').toDate();
            const t2 = FlexTime.getDeltaDate(t1, minutes);
            expect(FlexTime.getDeltaInMinutes(t1, t2)).toBe(-minutes);
            expect(FlexTime.getDeltaInMinutes(t2, t1)).toBe(minutes);
        });
    });
});

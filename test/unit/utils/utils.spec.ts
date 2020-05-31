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
import { Utils } from '../../../src/utils/utils';

describe('Utils static class', (): void => {
    describe('select iterable converter', (): void => {
        it('should convert all elements in an array', (): void => {
            const source = ['1', '2', '3'];
            const result = Utils.select(source, (source: string): number => {
                return Number(source);
            });
            expect(result).toEqual([1, 2, 3]);
        });

        it('should omit elements that convert to undefined', (): void => {
            const source = ['1', '2', 'boo', '3'];
            const result = Utils.select(source, (source: string): number|undefined => {
                return (source === 'boo') ? undefined : Number(source);
            });
            expect(result).toEqual([1, 2, 3]);
        });

        it('should return an empty array for an undefined parametr', (): void => {
            expect(Utils.select<string, string>(undefined, (s: string): string => s)).toEqual([]);
        });
    });

    describe('Utils toArray static method', (): void => {
        it('should convert an iterable to an array', (): void => {
            expect(Utils.toArray('blargle')).toEqual(['b', 'l', 'a', 'r', 'g', 'l', 'e']);
        });
    });
});

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

export class Utils {
    /* istanbul ignore next */
    private constructor() {} // eslint-disable-line

    /**
     * Constructs an array from an iterable, populated by calling a supplied converter function
     * on each element.  Similar to Array.map but works on iterables and undefined, omits any undefined
     * values returned by the converter, and always returns a (possibly empty) array.
     * @param source The iterable to be converted
     * @param selector The converter function to be called on each element
     */
    public static select<T1, T2>(source: Iterable<T1>|undefined, selector: {(arg: T1): T2|undefined}): T2[] {
        const result: T2[] = [];
        if (source) {
            for (const sourceItem of source) {
                const transformed = selector(sourceItem);
                if (transformed !== undefined) {
                    result.push(transformed);
                }
            }
        }
        return result;
    }

    public static toArray<T>(source: Iterable<T>): T[] {
        return Utils.select(source, (elem: T): T => elem);
    }
}

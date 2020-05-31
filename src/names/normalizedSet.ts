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
import { Names } from './names';

export class NormalizedSet extends Set<string> {
    public readonly elementDescription: string;

    public constructor(elementDescription?: string) {
        super();
        this.elementDescription = elementDescription ?? 'element';
    }

    public add(name: string): this {
        Names.throwOnInvalidName(name, this.elementDescription);
        return super.add(Names.normalizeOrThrow(name));
    }

    public addRange(names: Iterable<string>): this {
        Names.throwOnInvalidName(names, this.elementDescription);
        for (const name of names) {
            super.add(Names.normalizeOrThrow(name));
        }
        return this;
    }

    public delete(name: string): boolean {
        Names.throwOnInvalidName(name, this.elementDescription);
        return super.delete(Names.normalizeOrThrow(name));
    }

    public has(name: string): boolean {
        Names.throwOnInvalidName(name, this.elementDescription);
        return super.has(Names.normalizeOrThrow(name));
    }
};

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

import '../../helpers/jestHelpers';
import { loadJsonFile, saveJsonFile } from '../../../src/utils/jsonHelpers';
import fs from 'fs';

describe('JsonHelpers module', () => {
    describe('loadJsonFile method', () => {
        it('should return a requested json file', () => {
            const path = 'path/to/some/file.json';
            const payload = { someProperty: 'some value', prop: [1, 2] };
            jest.spyOn(fs, 'readFileSync').mockImplementation((gotPath: string) => {
                expect(gotPath).toContain(path);
                return JSON.stringify(payload);
            });

            expect(loadJsonFile(path)).toSucceedWith(payload);
        });

        it('should propagate an error', () => {
            const path = 'path/to/some/file.json';
            jest.spyOn(fs, 'readFileSync').mockImplementation((gotPath: string) => {
                expect(gotPath).toContain(path);
                throw new Error('Mock Error!');
            });

            expect(loadJsonFile(path)).toFailWith(/mock error/i);
        });
    });

    describe('saveJsonFile method', () => {
        it('should save to the requested json file', () => {
            const path = 'path/to/some/file.json';
            const payload = { someProperty: 'some value', prop: [1, 2] };
            jest.spyOn(fs, 'writeFileSync').mockImplementation((gotPath: string, gotPayload: string) => {
                expect(gotPath).toContain(path);
                expect(JSON.parse(gotPayload)).toEqual(payload);
            });

            expect(saveJsonFile(path, payload)).toSucceedWith(true);
        });

        it('should propagate an error', () => {
            const path = 'path/to/some/file.json';
            const payload = { someProperty: 'some value', prop: [1, 2] };
            jest.spyOn(fs, 'writeFileSync').mockImplementation((gotPath: string) => {
                expect(gotPath).toContain(path);
                throw new Error('Mock Error!');
            });

            expect(saveJsonFile(path, payload)).toFailWith(/mock error/i);
        });
    });
});

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
import { Gym } from '../../../src/pogo/gym';

describe('PoGo Gym module', () => {
    describe('Gym class', () => {
        const good = [
            {
                name: 'A gym',
                alternateNames: ['Alpha Gym'],
                city: 'Bigville',
                zones: ['Hot zone'],
                coord: {
                    latitude: 10,
                    longitude: 10,
                },
                isExEligible: true,
            },
            {
                name: 'A gym',
                city: 'Bigville',
                zones: ['Hot zone'],
                coord: {
                    latitude: 10,
                    longitude: 10,
                },
                isExEligible: false,
            },
        ];

        describe('constructor and create method', () => {
            test('constructs a gym from a valid initializer', () => {
                for (const init of good) {
                    [
                        new Gym(init),
                        Gym.createGym(init).getValueOrDefault(),
                    ].forEach((gym) => {
                        expect(gym).toBeDefined();
                        if (gym !== undefined) {
                            expect(gym.name).toEqual(init.name);
                            expect(gym.alternateNames).toEqual(init.alternateNames ?? []);
                            expect(gym.city).toEqual(init.city);
                            expect(gym.zones).toEqual(init.zones);
                            expect(gym.coord).toEqual(init.coord);
                            expect(gym.isExEligible).toEqual(init.isExEligible);
                        }
                    });
                }
            });
        });

        describe('toString method', () => {
            test('matches primaryKey', () => {
                for (const init of good) {
                    const gym = new Gym(init);
                    expect(gym.toString()).toEqual(gym.primaryKey);
                }
            });
        });
    });
});

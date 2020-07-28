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

import {
    FormatTestItems,
    evaluateTestCase,
} from '../../../helpers/formatHelpers';

import { Gym } from '../../../../src/pogo/gym';
import { TestRaidManager } from '../../../helpers/pogoHelpers';
import { gymFormatters } from '../../../../src/pogo/formatters';

describe('Gym formatters', () => {
    const { rm } = TestRaidManager.setup([]);
    const gyms = rm.gyms;

    type TestGymsKeys = 'brighton' | 'market' | 'northstar' | 'ridgeLibrary';
    const testGyms: FormatTestItems<TestGymsKeys, Gym> = {
        brighton: gyms.lookup('joanne brighton').firstItem().getValueOrThrow(),
        market: gyms.lookup('farmers market').firstItem().getValueOrThrow(),
        northstar: gyms.lookup('northstar').firstItem().getValueOrThrow(),
        ridgeLibrary: gyms
            .lookup('redmond ridge library')
            .firstItem()
            .getValueOrThrow(),
    };

    test('formats name correctly', () => {
        expect(evaluateTestCase('{{name}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": "Joanne Brighton Place",
        "market": "Farmers Market",
        "northstar": "Northstar Park",
        "ridgeLibrary": "Redmond Ridge Library Express",
      }
    `);
    });

    test('formats alternateNames correctly', () => {
        expect(evaluateTestCase('{{alternateNames}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": "Stormwater Pond (Brighton Place)",
        "market": "Redmond Town Center Fish Statue, Fish, Market",
        "northstar": "",
        "ridgeLibrary": "Library Express Redmond Ridge",
      }
    `);
    });

    test('formats city correctly', () => {
        expect(evaluateTestCase('{{city}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": "Redmond",
        "market": "Redmond",
        "northstar": "Redmond",
        "ridgeLibrary": "Redmond Ridge",
      }
    `);
    });

    test('formats zones correctly', () => {
        expect(evaluateTestCase('{{zones}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": "Rain City",
        "market": "Rain City",
        "northstar": "Rain City",
        "ridgeLibrary": "Rain City, RedmondRidgePoGo",
      }
    `);
    });

    test('formats coord correctly', () => {
        expect(evaluateTestCase('{{coord}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": "47.699476, -122.111885",
        "market": "47.671892, -122.124425",
        "northstar": "47.704642, -122.117114",
        "ridgeLibrary": "47.69332, -122.045556",
      }
    `);
    });

    test('formats directions correctly', () => {
        expect(evaluateTestCase('{{directions}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": Object {
          "embed": "[47.699476, -122.111885](https://www.google.com/maps/dir/?api=1&destination=47.699476,-122.111885)",
          "markdown": "https://www.google.com/maps/dir/?api=1&destination=47.699476,-122.111885",
          "text": "https://www.google.com/maps/dir/?api=1&destination=47.699476,-122.111885",
        },
        "market": Object {
          "embed": "[47.671892, -122.124425](https://www.google.com/maps/dir/?api=1&destination=47.671892,-122.124425)",
          "markdown": "https://www.google.com/maps/dir/?api=1&destination=47.671892,-122.124425",
          "text": "https://www.google.com/maps/dir/?api=1&destination=47.671892,-122.124425",
        },
        "northstar": Object {
          "embed": "[47.704642, -122.117114](https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114)",
          "markdown": "https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114",
          "text": "https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114",
        },
        "ridgeLibrary": Object {
          "embed": "[47.69332, -122.045556](https://www.google.com/maps/dir/?api=1&destination=47.69332,-122.045556)",
          "markdown": "https://www.google.com/maps/dir/?api=1&destination=47.69332,-122.045556",
          "text": "https://www.google.com/maps/dir/?api=1&destination=47.69332,-122.045556",
        },
      }
    `);
    });

    test('formats directionsLink correctly', () => {
        expect(evaluateTestCase('{{directionsLink}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": "https://www.google.com/maps/dir/?api=1&destination=47.699476,-122.111885",
        "market": "https://www.google.com/maps/dir/?api=1&destination=47.671892,-122.124425",
        "northstar": "https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114",
        "ridgeLibrary": "https://www.google.com/maps/dir/?api=1&destination=47.69332,-122.045556",
      }
    `);
    });

    test('formats exStatus correctly', () => {
        expect(evaluateTestCase('{{exStatus}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": "non-EX",
        "market": "EX-eligible",
        "northstar": "EX-eligible",
        "ridgeLibrary": "non-EX",
      }
    `);
    });

    test('formats description correctly', () => {
        expect(evaluateTestCase('{{description}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": "Joanne Brighton Place",
        "market": "Farmers Market [EX]",
        "northstar": "Northstar Park [EX]",
        "ridgeLibrary": "Redmond Ridge Library Express",
      }
    `);
    });

    test('formats details correctly', () => {
        expect(evaluateTestCase('{{details}}', testGyms, gymFormatters))
            .toMatchInlineSnapshot(`
      Object {
        "brighton": Object {
          "embed": "Joanne Brighton Place
        aka:               Stormwater Pond (Brighton Place)
        coordinates:       47.699476, -122.111885
        directions:        [47.699476, -122.111885](https://www.google.com/maps/dir/?api=1&destination=47.699476,-122.111885)
        city:              Redmond
        zones:             Rain City",
          "markdown": "Joanne Brighton Place
        aka:               Stormwater Pond (Brighton Place)
        coordinates:       47.699476, -122.111885
        directions:        https://www.google.com/maps/dir/?api=1&destination=47.699476,-122.111885
        city:              Redmond
        zones:             Rain City",
          "text": "Joanne Brighton Place
        aka:               Stormwater Pond (Brighton Place)
        coordinates:       47.699476, -122.111885
        directions:        https://www.google.com/maps/dir/?api=1&destination=47.699476,-122.111885
        city:              Redmond
        zones:             Rain City",
        },
        "market": Object {
          "embed": "Farmers Market [EX]
        aka:               Redmond Town Center Fish Statue, Fish, Market
        coordinates:       47.671892, -122.124425
        directions:        [47.671892, -122.124425](https://www.google.com/maps/dir/?api=1&destination=47.671892,-122.124425)
        city:              Redmond
        zones:             Rain City",
          "markdown": "Farmers Market [EX]
        aka:               Redmond Town Center Fish Statue, Fish, Market
        coordinates:       47.671892, -122.124425
        directions:        https://www.google.com/maps/dir/?api=1&destination=47.671892,-122.124425
        city:              Redmond
        zones:             Rain City",
          "text": "Farmers Market [EX]
        aka:               Redmond Town Center Fish Statue, Fish, Market
        coordinates:       47.671892, -122.124425
        directions:        https://www.google.com/maps/dir/?api=1&destination=47.671892,-122.124425
        city:              Redmond
        zones:             Rain City",
        },
        "northstar": Object {
          "embed": "Northstar Park [EX]
        coordinates:       47.704642, -122.117114
        directions:        [47.704642, -122.117114](https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114)
        city:              Redmond
        zones:             Rain City",
          "markdown": "Northstar Park [EX]
        coordinates:       47.704642, -122.117114
        directions:        https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114
        city:              Redmond
        zones:             Rain City",
          "text": "Northstar Park [EX]
        coordinates:       47.704642, -122.117114
        directions:        https://www.google.com/maps/dir/?api=1&destination=47.704642,-122.117114
        city:              Redmond
        zones:             Rain City",
        },
        "ridgeLibrary": Object {
          "embed": "Redmond Ridge Library Express
        aka:               Library Express Redmond Ridge
        coordinates:       47.69332, -122.045556
        directions:        [47.69332, -122.045556](https://www.google.com/maps/dir/?api=1&destination=47.69332,-122.045556)
        city:              Redmond Ridge
        zones:             Rain City, RedmondRidgePoGo",
          "markdown": "Redmond Ridge Library Express
        aka:               Library Express Redmond Ridge
        coordinates:       47.69332, -122.045556
        directions:        https://www.google.com/maps/dir/?api=1&destination=47.69332,-122.045556
        city:              Redmond Ridge
        zones:             Rain City, RedmondRidgePoGo",
          "text": "Redmond Ridge Library Express
        aka:               Library Express Redmond Ridge
        coordinates:       47.69332, -122.045556
        directions:        https://www.google.com/maps/dir/?api=1&destination=47.69332,-122.045556
        city:              Redmond Ridge
        zones:             Rain City, RedmondRidgePoGo",
        },
      }
    `);
    });
});

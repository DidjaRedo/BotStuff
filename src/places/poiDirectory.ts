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
import * as PoiLookupOptions from './poiLookupOptions';
import { DirectoryBase, DirectoryFilter, SearchResult } from '../names/directory';
import { Poi, PoiKeys, PoiProperties } from './poi';

export class PoiDirectoryBase<P extends Poi, O extends PoiLookupOptions.Properties> extends DirectoryBase<P, PoiProperties, PoiKeys, PoiLookupOptions.Properties> {
    public constructor(pois?: Iterable<P>) {
        super(Poi.getDirectoryOptions(), pois);
    }

    protected _adjustLookupResults(
        results: SearchResult<P>[],
        options?: O,
        filter?: DirectoryFilter<P, O>,
    ): SearchResult<P>[] {
        return PoiLookupOptions.adjustLookupResults(results, options, filter);
    }
}

/*
export class PoiDirectory extends PoiDirectoryBase<Poi, PoiLookupOptions.Properties> {
    public constructor(pois?: Iterable<Poi>) {
        super(pois);
    }
}
*/

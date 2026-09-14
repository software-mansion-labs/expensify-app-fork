import CONST from '@src/CONST';

import type {SearchOptionsFormatConfig} from './types';

/** The contact slots `getValidOptions` grants however many reports matched, so contacts never ask for fewer. */
const MIN_CONTACT_SLOTS = 5;

/** How much wider the second attempt asks when a predicate that stayed in JS emptied part of the exact window. */
const REFILL_FACTOR = 5;

type SearchWindow = {
    reportLimit: number;
    contactLimit: number;
};

/**
 * The most rows `getSearchOptions` can render for one query: `maxResults` reports, and contacts up to the widest
 * slot count its own formula hands out, which is `maxResults` minus the row the invite option takes.
 */
function getSearchWindow(formatConfig: SearchOptionsFormatConfig, factor = 1): SearchWindow {
    const maxResults = formatConfig.maxResults ?? CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS;
    return {
        reportLimit: maxResults * factor,
        contactLimit: Math.max(maxResults - 1, MIN_CONTACT_SLOTS) * factor,
    };
}

export {getSearchWindow, MIN_CONTACT_SLOTS, REFILL_FACTOR};
export type {SearchWindow};

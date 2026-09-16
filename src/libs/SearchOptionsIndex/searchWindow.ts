import CONST from '@src/CONST';

import type {SearchOptionsFormatConfig} from './types';

/** Contact slots `getValidOptions` grants however many reports matched, so the contact window is never smaller. */
const MIN_CONTACT_SLOTS = 5;

/**
 * How many candidates to select per row the list can render. The predicates that stayed in the pass over the
 * candidates drop some of them, and this slack is what keeps those drops from shortening the list.
 */
const OVERSHOOT_FACTOR = 2;

/** How much wider the single retry asks when the overshoot was not enough after all. */
const REFILL_FACTOR = 5;

type SearchWindow = {
    /** Reports the list can render, which is the length a result has to reach before the window is enough. */
    maxRenderedReports: number;

    reportLimit: number;
    contactLimit: number;
};

/**
 * How many candidates one query selects. The list renders at most `maxResults` reports and, by the slot formula
 * of `getValidOptions`, at most `maxResults` contacts minus the row the invite option takes.
 */
function getSearchWindow(formatConfig: SearchOptionsFormatConfig, factor: number = OVERSHOOT_FACTOR): SearchWindow {
    // The index has to rank into a bounded window, so a configuration without a limit of its own gets the
    // router's, which is the only screen this index serves.
    const maxResults = formatConfig.maxResults ?? CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS;

    return {
        maxRenderedReports: maxResults,
        reportLimit: maxResults * factor,
        contactLimit: Math.max(maxResults - 1, MIN_CONTACT_SLOTS) * factor,
    };
}

export {getSearchWindow, REFILL_FACTOR};
export type {SearchWindow};

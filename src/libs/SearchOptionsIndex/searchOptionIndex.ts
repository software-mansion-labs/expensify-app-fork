import {getSearchOptions, processSearchString} from '@libs/OptionsListUtils';
import type {Options} from '@libs/OptionsListUtils';

import type {OptionIndex} from './OptionIndex';
import type {SearchWindow} from './searchWindow';
import type {SearchCandidates, SearchOptionsFormatConfig} from './types';

import buildCandidateOptionList from './buildCandidateOptionList';
import matchIndexRows from './matchIndexRows';
import {getSearchWindow, REFILL_FACTOR} from './searchWindow';

function selectCandidates(index: OptionIndex, terms: string[], window: SearchWindow): SearchCandidates {
    const reports = matchIndexRows(index.reportRows.values(), terms, window.reportLimit);
    const contacts = matchIndexRows(index.contactRows.values(), terms, window.contactLimit, true);

    return {reportIDs: reports.ids, accountIDs: contacts.ids, hasMoreReports: reports.hasMore};
}

/**
 * Builds the options of the candidates and runs the router's own formatting over them, so every rule of today's
 * path still decides what is rendered. A candidate the index selected can still be dropped here.
 */
function formatCandidates(candidates: SearchCandidates, index: OptionIndex, query: string, formatConfig: SearchOptionsFormatConfig): Options {
    const optionList = buildCandidateOptionList(candidates, index, formatConfig);
    return getSearchOptions({...formatConfig, options: optionList, searchQuery: query}).options;
}

/** Whether the window was too narrow: the list came out short while more reports were waiting behind it. */
function needsWiderWindow(options: Options, candidates: SearchCandidates, window: SearchWindow): boolean {
    return options.recentReports.length < window.maxRenderedReports && candidates.hasMoreReports;
}

/**
 * The options of one query, served from the index instead of from an option list built over the whole account.
 *
 * Contacts are filtered entirely by their rows, so their window always holds what the list can render. Reports
 * are not: `isValidReport` reads the focused report and the report's own actions, which no row can carry, so it
 * runs over the candidates and may drop some of them. The window is wider than the list for that reason, and in
 * the rare case where even that was not enough the query is answered once more from a much wider one.
 */
function searchOptionIndex(index: OptionIndex, query: string, formatConfig: SearchOptionsFormatConfig): Options {
    const terms = processSearchString(query);
    const window = getSearchWindow(formatConfig);
    const candidates = selectCandidates(index, terms, window);
    const options = formatCandidates(candidates, index, query, formatConfig);

    if (!needsWiderWindow(options, candidates, window)) {
        return options;
    }

    const refillWindow = getSearchWindow(formatConfig, REFILL_FACTOR);
    return formatCandidates(selectCandidates(index, terms, refillWindow), index, query, formatConfig);
}

export default searchOptionIndex;

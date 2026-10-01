import {getSearchOptions, optionsOrderBy, processSearchString} from '@libs/OptionsListUtils';
import type {Options, SearchOption} from '@libs/OptionsListUtils';

import CONST from '@src/CONST';
import type {Report} from '@src/types/onyx';

import type {OptionIndex} from './OptionIndex';
import type {OptionIndexRow, SearchOptionsFormatConfig} from './types';

import {buildContactShells, buildReportOptions} from './buildCandidateOptionList';
import normalizeSearchText from './normalizeSearchText';

/** Candidates selected per rendered option in each batch: the slack that keeps `isValidReport` drops from shortening the list. */
const OVERSHOOT_FACTOR = 2;

/** Upper bound on the candidates one query evaluates, per rendered option (160 for a 20-option list). */
const MAX_BUDGET_FACTOR = 8;

/**
 * The best `limit` rows whose text contains every term. The ranking is the router's own bounded heap, so the ids
 * come back in the order the list renders them and the scan never sorts more than the window holds.
 */
function matchIndexRows(rows: Iterable<OptionIndexRow>, terms: string[], limit: number, shouldRankAscending = false): {ids: string[]; hasMore: boolean} {
    const normalizedTerms = terms.map((term) => normalizeSearchText(term));
    const isMatch = (row: OptionIndexRow) => row.isSelectable && normalizedTerms.every((term) => row.searchText.includes(term));
    const {options, hasMore} = optionsOrderBy(rows, (row) => row.orderKey, limit, isMatch, shouldRankAscending);

    return {ids: options.map((row) => row.id), hasMore};
}

/**
 * Searches the option index. Contacts are decided by their rows alone. Report candidates are formatted in growing
 * batches, each report once, until the list is full, the matches run out or the budget is spent. Past the budget,
 * older matches the pass over the candidates would have kept are not offered: the bound trades them for a
 * predictable keystroke.
 */
function searchOptionIndex(index: OptionIndex, query: string, formatConfig: SearchOptionsFormatConfig): Options {
    const terms = processSearchString(query);
    const maxResults = formatConfig.maxResults ?? CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS;
    const batchStep = maxResults * OVERSHOOT_FACTOR;
    const maxBudget = maxResults * MAX_BUDGET_FACTOR;
    const inputs = index.getInputs();

    const personalDetails = buildContactShells(matchIndexRows(index.contactRows.values(), terms, maxResults, true).ids, index, formatConfig);
    const reportMatches = matchIndexRows(index.reportRows.values(), terms, maxBudget);
    const formattedReportsByID = new Map<string, SearchOption<Report>>();
    let options: Options | undefined;

    for (let limit = batchStep; limit <= maxBudget; limit += batchStep) {
        const ids = reportMatches.ids.slice(0, limit);
        const unformattedIDs = ids.filter((id) => !formattedReportsByID.has(id));
        for (const option of buildReportOptions(unformattedIDs, inputs, formatConfig)) {
            formattedReportsByID.set(option.reportID, option);
        }
        const reports = ids.map((id) => formattedReportsByID.get(id)).filter((option): option is SearchOption<Report> => !!option);

        options = getSearchOptions({...formatConfig, options: {reports, personalDetails}, searchQuery: query}).options;
        if (options.recentReports.length >= maxResults || (reportMatches.ids.length <= limit && !reportMatches.hasMore)) {
            return options;
        }
    }

    return options ?? getSearchOptions({...formatConfig, options: {reports: [], personalDetails}, searchQuery: query}).options;
}

export default searchOptionIndex;
export {matchIndexRows};

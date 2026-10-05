import {usePersonalDetails} from '@components/OnyxListItemProvider';

import type {Options, SearchOption} from '@libs/OptionsListUtils';
import {buildReportOptions} from '@libs/SearchOptionsIndex/buildCandidateOptionList';
import {feedSearchOptionsIndex, getSearchOptionsFromIndex, getSearchOptionsIndexVersion, subscribeToSearchOptions} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import type {SearchOptionsFormatConfig} from '@libs/SearchOptionsIndex/types';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import {useEffect, useSyncExternalStore} from 'react';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useLocalize from './useLocalize';
import useOnyx from './useOnyx';
import usePrivateIsArchivedMap from './usePrivateIsArchivedMap';
import useReportAttributes from './useReportAttributes';

type UseSearchRouterOptionsParams = {
    /** The debounced query. An empty one keeps the index warm without searching it. */
    query: string;

    formatConfig: SearchOptionsFormatConfig;

    /** The reports the server matched the query to, which the index may not match on or may not have been fed yet. */
    serverReportIDs: readonly string[];
};

type SearchRouterOptions = {
    /** The index's answer to the query, or nothing for an empty query. */
    searchOptions: Options | undefined;

    /** The options of `serverReportIDs` that exist locally, unfiltered, built from the snapshots the index is fed. */
    serverReportOptions: Array<SearchOption<Report>>;
};

/** Subscription used while the query is empty, so index updates do not re-render the router. */
const noopSubscribe = () => () => {};

/**
 * The SearchRouter's search results, served from the option index: only the options of the rows a query selected
 * are built, so a keystroke costs a scan of the index instead of an option per report and contact of the account.
 *
 * Query evaluation is performed synchronously during render against the warm index, avoiding intermediate renders
 * with stale results and nested-update commits.
 */
function useSearchRouterOptions({query, formatConfig, serverReportIDs}: UseSearchRouterOptionsParams): SearchRouterOptions {
    const [reports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const personalDetails = usePersonalDetails();
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [rules] = useOnyx(ONYXKEYS.COLLECTION.RULE);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const reportAttributes = useReportAttributes();
    const privateIsArchivedMap = usePrivateIsArchivedMap();
    const {preferredLocale, translate} = useLocalize();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    // Re-render when the index is modified by background Onyx updates or index warmup completion.
    // Subscribe only while a query is active to avoid re-rendering SearchAutocompleteList when empty-query options are rendered instead.
    const hasQuery = !!query.trim();
    const subscribe = hasQuery ? subscribeToSearchOptions : noopSubscribe;
    const indexVersion = useSyncExternalStore(subscribe, getSearchOptionsIndexVersion, getSearchOptionsIndexVersion);

    const inputs = {reports, personalDetails, reportAttributes, policies, rules, privateIsArchivedMap, conciergeReportID, currentUserAccountID, locale: preferredLocale, translate};
    useEffect(() => {
        feedSearchOptionsIndex(inputs);
    }, [inputs]);

    // Built from this render's snapshots rather than the index's, which are only fed after the commit: the server's
    // answer often lands together with the reports it names.
    const serverReportOptions = buildReportOptions(serverReportIDs, inputs, formatConfig);

    return {
        // indexVersion is an explicit argument so React Compiler memoizes on it.
        searchOptions: getSearchOptionsFromIndex(query, formatConfig, indexVersion),
        serverReportOptions,
    };
}

export default useSearchRouterOptions;

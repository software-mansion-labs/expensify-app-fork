import type {Options} from '@libs/OptionsListUtils';
import {feedSearchOptionsIndex, getSearchOptionsFromIndex, requestSearchOptions, subscribeToSearchOptions} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import type {SearchOptionsFormatConfig} from '@libs/SearchOptionsIndex/types';

import ONYXKEYS from '@src/ONYXKEYS';

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
};

/**
 * The SearchRouter's search results, served from the option index: only the options of the rows a query selected
 * are built, so a keystroke costs a scan of the index instead of an option per report and contact of the account.
 *
 * The index is kept up to date while this screen is mounted, which is what makes the first keystroke as cheap as
 * the rest, and it is queried in the tick a new query arrives. The result of the previous query stays in place
 * until then, which is the behavior the list already has inside its debounce window.
 */
function useSearchRouterOptions({query, formatConfig}: UseSearchRouterOptionsParams): Options | undefined {
    const [reports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [rules] = useOnyx(ONYXKEYS.COLLECTION.RULE);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const reportAttributes = useReportAttributes();
    const privateIsArchivedMap = usePrivateIsArchivedMap();
    const {preferredLocale, translate} = useLocalize();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    const options = useSyncExternalStore(subscribeToSearchOptions, getSearchOptionsFromIndex, getSearchOptionsFromIndex);

    useEffect(() => {
        feedSearchOptionsIndex({
            reports,
            personalDetails,
            reportAttributes,
            policies,
            rules,
            privateIsArchivedMap,
            conciergeReportID,
            currentUserAccountID,
            locale: preferredLocale,
            translate,
        });
    }, [reports, personalDetails, reportAttributes, policies, rules, privateIsArchivedMap, conciergeReportID, currentUserAccountID, preferredLocale, translate]);

    useEffect(() => {
        requestSearchOptions(query, formatConfig);
    }, [query, formatConfig]);

    return options;
}

export default useSearchRouterOptions;
export type {UseSearchRouterOptionsParams};

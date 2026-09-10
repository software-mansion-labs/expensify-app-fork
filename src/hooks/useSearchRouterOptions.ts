import type {Options} from '@libs/OptionsListUtils';
import {feedSearchOptionsIndex, getSearchOptionsIndexSnapshot, requestSearchOptions, subscribeToSearchOptionsIndex} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import type {SearchOptionsFormatConfig} from '@libs/SearchOptionsIndex/types';

import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect, useSyncExternalStore} from 'react';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useLocalize from './useLocalize';
import useOnyx from './useOnyx';
import usePrivateIsArchivedMap from './usePrivateIsArchivedMap';
import useReportAttributes from './useReportAttributes';

type UseSearchRouterOptionsParams = {
    /** Whether the index serves this screen. When false the hook feeds nothing and returns nothing. */
    isEnabled: boolean;
    /** The debounced query. Empty keeps the index warm without searching. */
    query: string;
    formatConfig: SearchOptionsFormatConfig;
};

/**
 * Search results of the SearchRouter served by the option index (JS or SQLite worker) instead of the full option
 * list. The index is fed while the screen is mounted, so the first keystroke does not pay for building it. The
 * latest completed result is returned until the next one lands, which is the same stale-while-typing behavior the
 * list already has during its debounce window.
 */
function useSearchRouterOptions({isEnabled, query, formatConfig}: UseSearchRouterOptionsParams): Options | undefined {
    const [reports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const reportAttributes = useReportAttributes();
    const privateIsArchivedMap = usePrivateIsArchivedMap();
    const {preferredLocale, translate} = useLocalize();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    const snapshot = useSyncExternalStore(subscribeToSearchOptionsIndex, getSearchOptionsIndexSnapshot, getSearchOptionsIndexSnapshot);

    useEffect(() => {
        if (!isEnabled) {
            return;
        }
        feedSearchOptionsIndex({reports, personalDetails, reportAttributes, policies, privateIsArchivedMap, conciergeReportID, currentUserAccountID, locale: preferredLocale, translate});
    }, [isEnabled, reports, personalDetails, reportAttributes, policies, privateIsArchivedMap, conciergeReportID, currentUserAccountID, preferredLocale, translate]);

    useEffect(() => {
        if (!isEnabled || query.trim() === '') {
            return;
        }
        requestSearchOptions(query, formatConfig);
    }, [isEnabled, query, formatConfig]);

    return isEnabled ? snapshot?.options : undefined;
}

export default useSearchRouterOptions;
export type {UseSearchRouterOptionsParams};

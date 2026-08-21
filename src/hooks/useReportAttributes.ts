import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAttributesDerivedValue} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import useAppReadyOnyxValue from './useAppReadyOnyxValue';
import useOnDemandReportName, {useOnDemandReportNames} from './useOnDemandReportName';
import useOnyx from './useOnyx';

/**
 * Returns `reports` from the REPORT_ATTRIBUTES derived value.
 *
 * This hook intentionally avoids using a selector. When a selector is passed to
 * `useOnyx`, it forces a `deepEqual` comparison on every Onyx update cycle. Because
 * `reports` is a large `Record<string, ReportAttributes>`, that deep comparison is
 * O(n) and expensive.
 *
 * Lazy-Onyx POC: the subscription is deferred until the app is interactive
 * (useAppReadyOnyxValue) — always-mounted whole-map consumers (LHN, tooltips, Search shells) must
 * not start the derived engine during boot. Until the deferred subscription attaches, the persisted
 * last-session map from cache is served — the same values today's UI shows before the engine's
 * first flush.
 */
function useReportAttributes() {
    const reportAttributes = useAppReadyOnyxValue(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES);
    return reportAttributes?.reports;
}

/**
 * Returns a single report's attributes using a selector.
 * Deep comparison is cheap (single small object), so re-renders only occur
 * when that specific report's attributes change — not on every global report change.
 */
function useReportAttributesByID(reportID: string | undefined) {
    const reportAttributesByIDSelector = (value: OnyxEntry<ReportAttributesDerivedValue>) => (reportID ? value?.reports?.[reportID] : undefined);
    const [reportAttributes] = useOnyx(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {
        selector: reportAttributesByIDSelector,
    });
    return reportAttributes;
}

/**
 * Returns a single report's name using a selector.
 *
 * Use this when a component only needs one report's name: the selector output is a primitive string, so its
 * comparison is trivial and the component re-renders only when that specific report's name changes — not on
 * every global report attribute change.
 *
 * Lazy-Onyx POC (reportAttributes retirement): the name is computed ON DEMAND from targeted member
 * reads (`useOnDemandReportName`) instead of the REPORT_ATTRIBUTES derived value — a subscription to
 * that key would start its engine and hydrate every dependency collection to serve one name. The API
 * is unchanged for consumers; the value is briefly `undefined` while the first compute resolves
 * (consumers already fall back through `getReportName(report, derivedReportName)`).
 */
function useDerivedReportNameByReportID(reportID: string | undefined) {
    return useOnDemandReportName(reportID);
}

/**
 * Returns a `{reportID: reportName}` map for the given reportIDs from a single REPORT_ATTRIBUTES subscription.
 *
 * Use this instead of calling `useDerivedReportNameByReportID` multiple times in one component: it subscribes to
 * REPORT_ATTRIBUTES once (not once per report) while still selecting only the needed names (reusing
 * `reportNameSelector`), so the component re-renders only when one of those names changes. The selector output is
 * tiny (one name per requested ID), so its `deepEqual` is cheap.
 */
function useDerivedReportNamesByReportIDs(reportIDs: Array<string | undefined>) {
    // Lazy-Onyx POC: on-demand per-report computes instead of a derived-value subscription — see
    // useDerivedReportNameByReportID above. Same `{reportID: name}` shape as before.
    return useOnDemandReportNames(reportIDs);
}

export default useReportAttributes;
export {useReportAttributesByID, useDerivedReportNameByReportID, useDerivedReportNamesByReportIDs};

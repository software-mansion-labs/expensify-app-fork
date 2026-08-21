import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {translate as translateForLocale} from '@libs/Localize';
import {computeReportAttributesOnDemand, watchOnDemandReportAttributes} from '@libs/OnDemandReportAttributes';
import type {OnDemandNameContext} from '@libs/OnDemandReportName';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAttributes} from '@src/types/onyx/DerivedValues';

import {isTrackIntentUserSelector} from '@selectors/Onboarding';
import {deepEqual} from 'fast-equals';
import {useEffect, useState} from 'react';

import useNetwork from './useNetwork';
import useOnyx from './useOnyx';

/**
 * One report's FULL attributes (brick road, action badge, errors, name...), computed ON DEMAND
 * (lazy-Onyx POC, reportAttributes retirement) — the drop-in for selecting
 * `DERIVED.REPORT_ATTRIBUTES.reports[reportID]`, which would start the derived engine and hydrate
 * every dependency collection to serve one report. Live: the compute's recorded dependency keys are
 * watched for writes, and the singleton inputs are subscriptions of this hook. `undefined` until the
 * first compute resolves and for missing/invalid reports (same as the derived value's missing entry).
 */
function useOnDemandReportAttributes(reportID: string | undefined): ReportAttributes | undefined {
    // Singleton inputs — all eager under lazy Onyx, so these subscriptions hydrate nothing.
    const [personalDetailsList] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [preferredLocale] = useOnyx(ONYXKEYS.NVP_PREFERRED_LOCALE);
    // The compute reads offline state live (like the derived config); this subscription just re-runs it on changes.
    const {isOffline} = useNetwork();

    const currentUserAccountID = session?.accountID ?? CONST.DEFAULT_NUMBER_ID;
    const currentUserLogin = session?.email ?? '';
    const isTrackIntentUser = isTrackIntentUserSelector(introSelected);

    const [attributes, setAttributes] = useState<ReportAttributes | undefined>(undefined);

    useEffect(() => {
        if (!reportID) {
            return;
        }

        // One mutable holder instead of captured `let`s — React Compiler can't lower update
        // expressions on variables captured across the lambdas below.
        const lifecycle = {isCancelled: false, unwatch: undefined as (() => void) | undefined, computeEpoch: 0, isRecomputeScheduled: false};

        const recompute = () => {
            lifecycle.computeEpoch += 1;
            const epoch = lifecycle.computeEpoch;
            const dateFnsLocale = IntlStore.getDateFnsLocale(preferredLocale);
            const translate: LocalizedTranslate = (path, ...parameters) => translateForLocale(preferredLocale, path, ...parameters);
            const context: OnDemandNameContext = {
                personalDetailsList,
                currentUserAccountID,
                currentUserLogin,
                translate,
                dateFnsLocale,
                conciergeReportID,
                isTrackIntentUser,
            };
            computeReportAttributesOnDemand(reportID, context).then((result) => {
                // Only the newest compute may publish — an older in-flight pass must not overwrite fresher data.
                if (lifecycle.isCancelled || epoch !== lifecycle.computeEpoch) {
                    return;
                }
                lifecycle.unwatch?.();
                lifecycle.unwatch = watchOnDemandReportAttributes(result, scheduleRecompute);
                setAttributes((previous) => (deepEqual(previous, result.attributes) ? previous : result.attributes));
            });
        };

        // Coalesce bursts of dependency writes into one recompute per microtask turn.
        function scheduleRecompute() {
            if (lifecycle.isRecomputeScheduled) {
                return;
            }
            lifecycle.isRecomputeScheduled = true;
            queueMicrotask(() => {
                lifecycle.isRecomputeScheduled = false;
                if (!lifecycle.isCancelled) {
                    recompute();
                }
            });
        }

        recompute();

        return () => {
            lifecycle.isCancelled = true;
            lifecycle.unwatch?.();
        };
    }, [reportID, personalDetailsList, currentUserAccountID, currentUserLogin, conciergeReportID, isTrackIntentUser, preferredLocale, isOffline]);

    return reportID ? attributes : undefined;
}

export default useOnDemandReportAttributes;

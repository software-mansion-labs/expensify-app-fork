import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {translate as translateForLocale} from '@libs/Localize';
import {computeReportNameOnDemand, watchOnDemandReportName} from '@libs/OnDemandReportName';
import type {OnDemandNameContext} from '@libs/OnDemandReportName';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';

import {isTrackIntentUserSelector} from '@selectors/Onboarding';
import {useEffect, useMemo, useState} from 'react';

import useOnyx from './useOnyx';

type OnDemandReportNames = Record<string, string | undefined>;

const EMPTY_NAMES: OnDemandReportNames = {};

function areNamesEqual(left: OnDemandReportNames, right: OnDemandReportNames): boolean {
    const leftKeys = Object.keys(left);
    if (leftKeys.length !== Object.keys(right).length) {
        return false;
    }
    return leftKeys.every((key) => left[key] === right[key]);
}

/**
 * Report names for the given reports, computed ON DEMAND (lazy-Onyx POC, reportAttributes
 * retirement): targeted member reads + per-report indexed queries via `computeReportNameOnDemand`
 * instead of subscribing to the REPORT_ATTRIBUTES derived value — which would start its engine and
 * hydrate every dependency collection to serve a handful of names. Names stay live: the compute's
 * recorded dependency keys are watched for writes, and the singleton inputs (session, locale,
 * personal details, ...) are subscriptions of this hook.
 *
 * Same consumer shape as `useDerivedReportNamesByReportIDs`: a `{reportID: name}` map.
 */
function useOnDemandReportNames(reportIDs: Array<string | undefined>): OnDemandReportNames {
    const signature = useMemo(() => [...new Set(reportIDs.filter((reportID): reportID is string => !!reportID))].sort().join(','), [reportIDs]);

    // Singleton inputs — all eager under lazy Onyx, so these subscriptions hydrate nothing.
    const [personalDetailsList] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const [session] = useOnyx(ONYXKEYS.SESSION);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [preferredLocale] = useOnyx(ONYXKEYS.NVP_PREFERRED_LOCALE);

    const currentUserAccountID = session?.accountID ?? CONST.DEFAULT_NUMBER_ID;
    const currentUserLogin = session?.email ?? '';
    const isTrackIntentUser = isTrackIntentUserSelector(introSelected);

    const [names, setNames] = useState<OnDemandReportNames>(EMPTY_NAMES);

    useEffect(() => {
        if (!signature) {
            return;
        }
        const ids = signature.split(',');

        // One mutable holder instead of captured `let`s — React Compiler can't lower update
        // expressions on variables captured across the lambdas below.
        const lifecycle = {isCancelled: false, unwatchers: [] as Array<() => void>, computeEpoch: 0, isRecomputeScheduled: false};

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
            Promise.all(ids.map((reportID) => computeReportNameOnDemand(reportID, context).then((result) => [reportID, result] as const))).then((results) => {
                // Only the newest compute may publish — an older in-flight pass must not overwrite fresher data.
                if (lifecycle.isCancelled || epoch !== lifecycle.computeEpoch) {
                    return;
                }
                for (const unwatch of lifecycle.unwatchers) {
                    unwatch();
                }
                lifecycle.unwatchers = results.map(([, result]) => watchOnDemandReportName(result, scheduleRecompute));
                const nextNames: OnDemandReportNames = {};
                for (const [reportID, result] of results) {
                    nextNames[reportID] = result.name;
                }
                setNames((previousNames) => (areNamesEqual(previousNames, nextNames) ? previousNames : nextNames));
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
            for (const unwatch of lifecycle.unwatchers) {
                unwatch();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- translate/dateFnsLocale/context are derived from exactly these inputs inside recompute
    }, [signature, personalDetailsList, currentUserAccountID, currentUserLogin, conciergeReportID, isTrackIntentUser, preferredLocale]);

    // Never leak a name for an ID no longer requested (e.g. after the signature narrows).
    return useMemo(() => {
        if (!signature) {
            return EMPTY_NAMES;
        }
        const requested: OnDemandReportNames = {};
        for (const reportID of signature.split(',')) {
            requested[reportID] = names[reportID];
        }
        return requested;
    }, [signature, names]);
}

/** Single-report variant of `useOnDemandReportNames` — the drop-in for `useDerivedReportNameByReportID`. */
function useOnDemandReportName(reportID: string | undefined): string | undefined {
    const names = useOnDemandReportNames([reportID]);
    return reportID ? names[reportID] : undefined;
}

export default useOnDemandReportName;
export {useOnDemandReportNames};

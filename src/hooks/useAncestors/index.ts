import {computeAncestorChainOnDemand, deriveAncestorsFromChain, watchAncestorChain} from '@libs/OnDemandAncestors';
import type {AncestorChainLink} from '@libs/OnDemandAncestors';
import type {Ancestor} from '@libs/ReportUtils';

import type {Report, ReportAction} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {useEffect, useMemo, useState} from 'react';

const EMPTY_CHAIN: AncestorChainLink[] = [];

/**
 * Fetches ancestor reports and their associated actions for a given report.
 *
 * Lazy-Onyx POC: the raw parent chain (typically 0-2 hops) comes from targeted member reads kept
 * live by write watchers scoped to the visited keys — this hook used to subscribe to the whole
 * REPORT, REPORT_DRAFT and REPORT_ACTIONS collections. The exclusion callback is applied in a pure,
 * synchronous replay over the fetched chain (it terminates the walk exactly like `getAncestors`),
 * so callback identity churn never refetches anything.
 *
 * @param report - The report for which to fetch ancestor reports and actions.
 * @param shouldExcludeAncestorReportActionCallback - Callback to determine if an ancestor should be excluded.
 * @returns An array of ancestor reports and their associated actions.
 */
function useAncestors(report: OnyxEntry<Report>, shouldExcludeAncestorReportActionCallback: (reportAction: ReportAction, isFirstAncestor: boolean) => boolean = () => false): Ancestor[] {
    const [chain, setChain] = useState<AncestorChainLink[]>(EMPTY_CHAIN);

    const reportID = report?.reportID;
    const parentReportID = report?.parentReportID;
    const parentReportActionID = report?.parentReportActionID;

    useEffect(() => {
        if (!reportID || !parentReportID || !parentReportActionID) {
            setChain(EMPTY_CHAIN);
            return;
        }

        // One mutable holder instead of captured `let`s — React Compiler can't lower update
        // expressions on variables captured across the lambdas below.
        const lifecycle = {isCancelled: false, unwatch: undefined as (() => void) | undefined, computeEpoch: 0, isRecomputeScheduled: false};

        const recompute = () => {
            lifecycle.computeEpoch += 1;
            const epoch = lifecycle.computeEpoch;
            computeAncestorChainOnDemand({reportID, parentReportID, parentReportActionID}).then((result) => {
                // Only the newest compute may publish — an older in-flight pass must not overwrite fresher data.
                if (lifecycle.isCancelled || epoch !== lifecycle.computeEpoch) {
                    return;
                }
                lifecycle.unwatch?.();
                lifecycle.unwatch = watchAncestorChain(result, scheduleRecompute);
                setChain((previousChain) => (previousChain.length === 0 && result.chain.length === 0 ? previousChain : result.chain));
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
    }, [reportID, parentReportID, parentReportActionID]);

    return useMemo(() => deriveAncestorsFromChain(chain, shouldExcludeAncestorReportActionCallback), [chain, shouldExcludeAncestorReportActionCallback]);
}

export default useAncestors;

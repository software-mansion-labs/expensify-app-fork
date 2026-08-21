import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAction} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import type {Ancestor} from './ReportUtils';

import {createScopedStore, watchScopedDependencies} from './OnDemandOnyxStore';
import {isCurrentActionUnread} from './ReportActionsUtils';

/**
 * Lazy-Onyx POC: the thread-ancestry walk from targeted member reads. `useAncestors` used to
 * subscribe to THREE whole collections (REPORT, REPORT_DRAFT, REPORT_ACTIONS — the heaviest data in
 * the store) to follow a parent chain that is typically 0-2 hops; with four instantiations per
 * composer that meant twelve whole-collection subscriptions on every chat.
 *
 * The fetch produces the RAW chain (no exclusion callback): the callback TERMINATES the walk, so
 * consumers with different callbacks derive their own view from the shared raw chain via
 * `deriveAncestorsFromChain` — a pure replay of `getAncestors`' exact semantics.
 */

const MAX_ANCESTOR_DEPTH = 15;

type AncestorChainLink = {
    /** The parent report (or its draft) at this hop. */
    report: Report;
    /** The parent report action linking the child to this parent. */
    reportAction: ReportAction;
};

type OnDemandAncestorChain = {
    /** Walk order: immediate parent first, root last (getAncestors' traversal order, pre-unshift). */
    chain: AncestorChainLink[];
    /** Full Onyx keys the walk depends on — a write to any of them invalidates the chain. */
    visitedKeys: Set<string>;
    /** The chain's report IDs (a NEW parent action landing on any of them invalidates too). */
    chainReportIDs: Set<string>;
};

/** Watched collections: the three the walk reads. */
const ANCESTOR_COLLECTIONS = [ONYXKEYS.COLLECTION.REPORT, ONYXKEYS.COLLECTION.REPORT_DRAFT, ONYXKEYS.COLLECTION.REPORT_ACTIONS] as const;

async function computeAncestorChainOnDemand(report: OnyxEntry<Report>): Promise<OnDemandAncestorChain> {
    const store = createScopedStore();
    const chain: AncestorChainLink[] = [];
    const chainReportIDs = new Set<string>();

    const visit = (key: string) => {
        store.visited.add(key);
    };

    let currentReport: OnyxEntry<Report> = report;
    if (report?.reportID) {
        chainReportIDs.add(report.reportID);
    }
    for (let depth = 0; depth < MAX_ANCESTOR_DEPTH; depth++) {
        const parentReportID: string | undefined = currentReport?.parentReportID;
        const parentReportActionID: string | undefined = currentReport?.parentReportActionID;
        if (!parentReportID || !parentReportActionID) {
            break;
        }

        visit(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${parentReportID}`);
        visit(`${ONYXKEYS.COLLECTION.REPORT}${parentReportID}`);
        visit(`${ONYXKEYS.COLLECTION.REPORT_DRAFT}${parentReportID}`);

        // eslint-disable-next-line no-await-in-loop -- the chain is inherently sequential: each hop's ID comes from the previous parent
        const [parentActions, parentReport, parentDraft] = await Promise.all([
            OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${parentReportID}` as const),
            OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT}${parentReportID}` as const),
            OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT_DRAFT}${parentReportID}` as const),
        ]);

        const parentReportAction = parentActions?.[parentReportActionID];
        if (!parentReportAction) {
            break;
        }
        const nextReport: OnyxEntry<Report> = parentReport ?? parentDraft;
        if (!nextReport) {
            break;
        }

        chain.push({report: nextReport, reportAction: parentReportAction});
        chainReportIDs.add(parentReportID);
        currentReport = nextReport;
    }

    return {chain, visitedKeys: store.visited, chainReportIDs};
}

/**
 * Pure replay of `getAncestors`' semantics over a prefetched raw chain: the exclusion callback
 * terminates the walk (everything from the excluded hop upward is dropped), and results keep the
 * top-most-ancestor-first order (`unshift` in the original).
 */
function deriveAncestorsFromChain(chain: AncestorChainLink[], shouldExcludeAncestorReportActionCallback: (reportAction: ReportAction, isFirstAncestor: boolean) => boolean): Ancestor[] {
    const ancestors: Ancestor[] = [];
    for (const [index, link] of chain.entries()) {
        if (shouldExcludeAncestorReportActionCallback(link.reportAction, index === 0)) {
            break;
        }
        ancestors.unshift({
            report: link.report,
            reportAction: link.reportAction,
            shouldDisplayNewMarker: isCurrentActionUnread(link.report, link.reportAction),
        });
    }
    return ancestors;
}

/** Watches the chain's dependency keys for writes. Returns an unsubscribe function. */
function watchAncestorChain(result: OnDemandAncestorChain, onInvalidated: () => void): () => void {
    return watchScopedDependencies(ANCESTOR_COLLECTIONS, result.visitedKeys, result.chainReportIDs, onInvalidated);
}

export {computeAncestorChainOnDemand, deriveAncestorsFromChain, watchAncestorChain};
export type {OnDemandAncestorChain, AncestorChainLink};

import {isProduction as isProductionLib} from '@libs/Environment/Environment';
import {getLhnOrderIndexStats} from '@libs/LhnOrderIndex/LhnOrderIndexStore';
import type {LhnOrderIndexStats} from '@libs/LhnOrderIndex/LhnOrderIndexStore';
import navigationRef from '@libs/Navigation/navigationRef';
import {getReportActionsOrderStats} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import type {ReportActionsOrderStats} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import {getSearchOptionsIndexStats} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import type {SearchOptionsIndexStats} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import {getEngineStats} from '@libs/SqlEngine/EngineClient';
import {getReportActionsEngineMode, isReportActionsEngineMode, setReportActionsEngineMode} from '@libs/SqlEngine/engineMode';
import type {ReportActionsEngineMode} from '@libs/SqlEngine/engineMode';
import {getLhnEngineMode, isLhnEngineMode, isLhnGuardEnabled, setLhnEngineMode, setLhnGuardEnabled} from '@libs/SqlEngine/lhnEngineMode';
import type {LhnEngineMode} from '@libs/SqlEngine/lhnEngineMode';
import {
    getSearchRouterEngineMode,
    isSearchRouterEngineMode,
    isSearchRouterGuardEnabled,
    setSearchRouterEngineMode,
    setSearchRouterGuardEnabled,
} from '@libs/SqlEngine/searchRouterEngineMode';
import type {SearchRouterEngineMode} from '@libs/SqlEngine/searchRouterEngineMode';
import type {EngineStats} from '@libs/SqlEngine/wasm/protocol';

import {setSupportAuthToken} from '@userActions/Session';

import ONYXKEYS from '@src/ONYXKEYS';

import type {CollectionKeyBase} from 'react-native-onyx/dist/types';

import Onyx from 'react-native-onyx';

type ReportActionsEngineDevTools = {
    getMode: () => ReportActionsEngineMode;
    setMode: (mode: string) => void;
    getStats: () => Promise<{mode: ReportActionsEngineMode; store: ReportActionsOrderStats; engine: EngineStats | undefined}>;
};

type SearchRouterEngineDevTools = {
    getMode: () => SearchRouterEngineMode;
    setMode: (mode: string) => void;
    /** Compares every result with today's path and counts mismatches; expensive, so off by default. */
    setGuard: (isEnabled: boolean) => void;
    getStats: () => Promise<{mode: SearchRouterEngineMode; isGuardEnabled: boolean; store: SearchOptionsIndexStats; engine: EngineStats | undefined}>;
};

type LhnEngineDevTools = {
    getMode: () => LhnEngineMode;
    setMode: (mode: string) => void;
    /** Compares every engine order with today's order and counts mismatches; costs a full JS sort per write. */
    setGuard: (isEnabled: boolean) => void;
    getStats: () => Promise<{mode: LhnEngineMode; isGuardEnabled: boolean; store: LhnOrderIndexStats; engine: EngineStats | undefined}>;
};

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        /** Dev-only toggle of the report-actions SQL engine POC. */
        reportActionsEngine: ReportActionsEngineDevTools;
        /** Dev-only toggle of the SearchRouter option-index POC. */
        searchRouterEngine: SearchRouterEngineDevTools;
        /** Dev-only toggle of the LHN order POC. */
        lhnEngine: LhnEngineDevTools;
    }
}

/**
 * This is used to inject development/debugging utilities into the window object on web.
 * We do this only on non-production builds - these should not be used in any application code.
 */
export default function addUtilsToWindow() {
    if (!window) {
        return;
    }

    isProductionLib().then((isProduction) => {
        if (isProduction) {
            return;
        }

        window.Onyx = Onyx as typeof Onyx & {
            get: (key: CollectionKeyBase) => Promise<unknown>;
            log: (key: CollectionKeyBase) => void;
        };

        // We intentionally do not offer an Onyx.get API because we believe it will lead to code patterns we don't want to use in this repo, but we can offer a workaround for the sake of debugging
        window.Onyx.get = function (key: CollectionKeyBase) {
            return new Promise((resolve) => {
                // We have opted for `connectWithoutView` here as this is a debugging utility and does not relate to any view.
                const connection = Onyx.connectWithoutView({
                    key,
                    callback: (value) => {
                        Onyx.disconnect(connection);
                        resolve(value);
                    },
                });
            });
        };

        window.Onyx.log = function (key: CollectionKeyBase) {
            window.Onyx.get(key).then((value) => {
                /* eslint-disable-next-line no-console */
                console.log(value);
            });
        };

        window.setSupportToken = setSupportAuthToken;

        window.reportActionsEngine = {
            getMode: getReportActionsEngineMode,
            setMode: (mode: string) => {
                if (!isReportActionsEngineMode(mode)) {
                    /* eslint-disable-next-line no-console */
                    console.warn(`Unknown report actions engine mode "${mode}". Use "off", "preview" or "strict".`);
                    return;
                }
                setReportActionsEngineMode(mode);
                /* eslint-disable-next-line no-console */
                console.log(`Report actions engine mode is now "${mode}". It applies to report screens mounted from now on.`);
            },
            getStats: async () => ({
                mode: getReportActionsEngineMode(),
                store: getReportActionsOrderStats(),
                engine: await getEngineStats().catch(() => undefined),
            }),
        };

        window.searchRouterEngine = {
            getMode: getSearchRouterEngineMode,
            setMode: (mode: string) => {
                if (!isSearchRouterEngineMode(mode)) {
                    /* eslint-disable-next-line no-console */
                    console.warn(`Unknown search router engine mode "${mode}". Use "off", "js-index", "sql-like" or "sql-fts".`);
                    return;
                }
                setSearchRouterEngineMode(mode);
                /* eslint-disable-next-line no-console */
                console.log(`Search router engine mode is now "${mode}". It applies the next time the router opens; the SQL matcher is fixed once the worker has started.`);
            },
            setGuard: setSearchRouterGuardEnabled,
            getStats: async () => ({
                mode: getSearchRouterEngineMode(),
                isGuardEnabled: isSearchRouterGuardEnabled(),
                store: getSearchOptionsIndexStats(),
                engine: await getEngineStats().catch(() => undefined),
            }),
        };

        window.lhnEngine = {
            getMode: getLhnEngineMode,
            setMode: (mode: string) => {
                if (!isLhnEngineMode(mode)) {
                    /* eslint-disable-next-line no-console */
                    console.warn(`Unknown LHN engine mode "${mode}". Use "off" or "sql".`);
                    return;
                }
                setLhnEngineMode(mode);
                /* eslint-disable-next-line no-console */
                console.log(`LHN engine mode is now "${mode}". It applies the next time the sidebar provider mounts.`);
            },
            setGuard: setLhnGuardEnabled,
            getStats: async () => ({
                mode: getLhnEngineMode(),
                isGuardEnabled: isLhnGuardEnabled(),
                store: getLhnOrderIndexStats(),
                engine: await getEngineStats().catch(() => undefined),
            }),
        };

        // Helper to get current route params
        const getRouteParams = () => {
            return navigationRef.current?.getCurrentRoute()?.params as Record<string, string> | undefined;
        };

        // Helper to get reportID from various sources
        const getReportID = async (params: Record<string, string> | undefined) => {
            if (params?.reportID) {
                return params.reportID;
            }
            if (params?.transactionID) {
                const transaction = await window.Onyx.get(`${ONYXKEYS.COLLECTION.TRANSACTION}${params.transactionID}` as CollectionKeyBase);
                return (transaction as {reportID?: string} | undefined)?.reportID;
            }
            return undefined;
        };

        // Helper to get transactionID from one expense report
        const getTransactionIDFromReport = async (reportID: string) => {
            const report = await window.Onyx.get(`${ONYXKEYS.COLLECTION.REPORT}${reportID}` as CollectionKeyBase);
            const typedReport = report as {parentReportID?: string; parentReportActionID?: string} | undefined;

            // First try: Get from parent report action (for transaction thread reports)
            if (typedReport?.parentReportID && typedReport?.parentReportActionID) {
                const parentReportActions = await window.Onyx.get(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${typedReport.parentReportID}` as CollectionKeyBase);
                const parentAction = (parentReportActions as Record<string, {originalMessage?: {IOUTransactionID?: string}}> | undefined)?.[typedReport.parentReportActionID];
                if (parentAction?.originalMessage?.IOUTransactionID) {
                    return parentAction.originalMessage.IOUTransactionID;
                }
            }

            // Fallback: Search the report's own report actions (for expense reports with one transaction)
            const reportActions = await window.Onyx.get(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}` as CollectionKeyBase);
            const actions = reportActions as Record<string, {originalMessage?: {IOUTransactionID?: string}}> | undefined;
            if (actions) {
                for (const action of Object.values(actions)) {
                    if (action?.originalMessage?.IOUTransactionID) {
                        return action.originalMessage.IOUTransactionID;
                    }
                }
            }

            return undefined;
        };

        // Helper to get policyID from report (checks parent report for one expense reports)
        const getPolicyIDFromReport = async (reportID: string) => {
            const report = await window.Onyx.get(`${ONYXKEYS.COLLECTION.REPORT}${reportID}` as CollectionKeyBase);
            const typedReport = report as {policyID?: string; parentReportID?: string} | undefined;

            if (typedReport?.policyID) {
                return typedReport.policyID;
            }

            if (typedReport?.parentReportID) {
                const parentReport = await window.Onyx.get(`${ONYXKEYS.COLLECTION.REPORT}${typedReport.parentReportID}` as CollectionKeyBase);
                return (parentReport as {policyID?: string} | undefined)?.policyID;
            }

            return undefined;
        };

        // Define lazy getters for debug data
        Object.defineProperties(window, {
            policy: {
                configurable: true,
                get: async () => {
                    const params = getRouteParams();

                    if (params?.policyID) {
                        return window.Onyx.get(`${ONYXKEYS.COLLECTION.POLICY}${params.policyID}` as CollectionKeyBase);
                    }

                    const reportID = await getReportID(params);
                    if (reportID) {
                        const policyID = await getPolicyIDFromReport(reportID);
                        if (policyID) {
                            return window.Onyx.get(`${ONYXKEYS.COLLECTION.POLICY}${policyID}` as CollectionKeyBase);
                        }
                    }

                    return undefined;
                },
            },
            report: {
                configurable: true,
                get: async () => {
                    const params = getRouteParams();
                    const reportID = await getReportID(params);

                    if (reportID) {
                        return window.Onyx.get(`${ONYXKEYS.COLLECTION.REPORT}${reportID}` as CollectionKeyBase);
                    }

                    return undefined;
                },
            },
            transaction: {
                configurable: true,
                get: async () => {
                    const params = getRouteParams();

                    if (params?.transactionID) {
                        return window.Onyx.get(`${ONYXKEYS.COLLECTION.TRANSACTION}${params.transactionID}` as CollectionKeyBase);
                    }

                    if (params?.reportID) {
                        const transactionID = await getTransactionIDFromReport(params.reportID);
                        if (transactionID) {
                            return window.Onyx.get(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}` as CollectionKeyBase);
                        }
                    }

                    return undefined;
                },
            },
            receipt: {
                configurable: true,
                get: async () => {
                    const transaction = await (window as {transaction?: Promise<{receipt?: unknown}>}).transaction;
                    return transaction?.receipt;
                },
            },
        });
    });
}

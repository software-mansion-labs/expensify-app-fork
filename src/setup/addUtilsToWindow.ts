import Onyx from 'react-native-onyx';
import type {CollectionKeyBase} from 'react-native-onyx/dist/types';
import {isProduction as isProductionLib} from '@libs/Environment/Environment';
import navigationRef from '@libs/Navigation/navigationRef';
import {hasReceipt} from '@libs/TransactionUtils';
import {setMoneyRequestDescription} from '@userActions/IOU';
import {updateMoneyRequestDescription} from '@userActions/IOU/UpdateMoneyRequest';
import {setSupportAuthToken} from '@userActions/Session';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

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
                    waitForCollectionCallback: true,
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

        /**
         * Benchmark helper: edits an expense description using the full production code path.
         * Called from repo/search-refs/collect.ts via page.evaluate.
         */
        // @ts-expect-error -- benchmark utility, not part of the standard Window interface
        window.__benchmarkEditDescription = async (transactionID: string, comment: string) => {
            const get = (key: string) => window.Onyx.get(key as CollectionKeyBase);

            const transaction = (await get(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`)) as {reportID?: string; transactionID?: string} | undefined;
            if (!transaction?.reportID) {
                throw new Error(`Transaction ${transactionID} not found or has no reportID`);
            }

            const report = (await get(`${ONYXKEYS.COLLECTION.REPORT}${transaction.reportID}`)) as {parentReportID?: string; policyID?: string} | undefined;
            const parentReport = report?.parentReportID ? await get(`${ONYXKEYS.COLLECTION.REPORT}${report.parentReportID}`) : undefined;
            const policyID = report?.policyID;
            const policy = policyID ? await get(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`) : undefined;
            const policyTags = policyID ? await get(`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`) : undefined;
            const policyCategories = policyID ? await get(`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${policyID}`) : undefined;
            const parentReportNextStep = report?.parentReportID ? await get(`${ONYXKEYS.COLLECTION.NEXT_STEP}${report.parentReportID}`) : undefined;

            const session = (await get(ONYXKEYS.SESSION)) as {accountID?: number; email?: string} | undefined;
            const betas = ((await get(ONYXKEYS.BETAS)) ?? []) as string[];

            setMoneyRequestDescription(transactionID, comment, false, hasReceipt(transaction as Parameters<typeof hasReceipt>[0]));

            updateMoneyRequestDescription({
                transactionID,
                transactionThreadReport: report as Parameters<typeof updateMoneyRequestDescription>[0]['transactionThreadReport'],
                parentReport: parentReport as Parameters<typeof updateMoneyRequestDescription>[0]['parentReport'],
                comment,
                policy: policy as Parameters<typeof updateMoneyRequestDescription>[0]['policy'],
                policyTagList: policyTags as Parameters<typeof updateMoneyRequestDescription>[0]['policyTagList'],
                policyCategories: policyCategories as Parameters<typeof updateMoneyRequestDescription>[0]['policyCategories'],
                currentUserAccountIDParam: session?.accountID ?? 0,
                currentUserEmailParam: session?.email ?? '',
                isASAPSubmitBetaEnabled: betas.includes(CONST.BETAS.ASAP_SUBMIT),
                parentReportNextStep: parentReportNextStep as Parameters<typeof updateMoneyRequestDescription>[0]['parentReportNextStep'],
            });

            return {transactionID, comment};
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

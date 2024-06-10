import React, {createContext, useCallback, useContext, useMemo} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import {useOnyx} from 'react-native-onyx';
import {getPolicyEmployeeListByIdWithoutCurrentUser} from '@libs/PolicyUtils';
import * as ReportUtils from '@libs/ReportUtils';
import SidebarUtils from '@libs/SidebarUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';
import type {Message} from '@src/types/onyx/ReportAction';
import useActiveWorkspace from './useActiveWorkspace';
import useCurrentReportID from './useCurrentReportID';
import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';

type ChatReportSelector = OnyxTypes.Report & {isUnreadWithMention: boolean};
type PolicySelector = Pick<OnyxTypes.Policy, 'type' | 'name' | 'avatarURL' | 'employeeList'>;
type ReportActionsSelector = Array<Pick<OnyxTypes.ReportAction, 'reportActionID' | 'actionName' | 'errors' | 'message' | 'originalMessage'>>;

type ReportIDsContextProviderProps = {
    children: React.ReactNode;
    currentReportIDForTests?: string;
};

type ReportIDsContextValue = {
    orderedReportIDs: string[];
    currentReportID: string;
};

const ReportIDsContext = createContext<ReportIDsContextValue>({
    orderedReportIDs: [],
    currentReportID: '',
});

/**
 * This function (and the few below it), narrow down the data from Onyx to just the properties that we want to trigger a re-render of the component. This helps minimize re-rendering
 * and makes the entire component more performant because it's not re-rendering when a bunch of properties change which aren't ever used in the UI.
 */
const chatReportSelector = (report: OnyxEntry<OnyxTypes.Report>): ChatReportSelector =>
    (report && {
        reportID: report.reportID,
        participants: report.participants,
        isPinned: report.isPinned,
        isHidden: report.isHidden,
        notificationPreference: report.notificationPreference,
        errorFields: {
            addWorkspaceRoom: report.errorFields?.addWorkspaceRoom,
        },
        lastMessageText: report.lastMessageText,
        lastVisibleActionCreated: report.lastVisibleActionCreated,
        iouReportID: report.iouReportID,
        total: report.total,
        nonReimbursableTotal: report.nonReimbursableTotal,
        hasOutstandingChildRequest: report.hasOutstandingChildRequest,
        isWaitingOnBankAccount: report.isWaitingOnBankAccount,
        statusNum: report.statusNum,
        stateNum: report.stateNum,
        chatType: report.chatType,
        type: report.type,
        policyID: report.policyID,
        visibility: report.visibility,
        lastReadTime: report.lastReadTime,
        // Needed for name sorting:
        reportName: report.reportName,
        policyName: report.policyName,
        oldPolicyName: report.oldPolicyName,
        // Other less obvious properites considered for sorting:
        ownerAccountID: report.ownerAccountID,
        currency: report.currency,
        managerID: report.managerID,
        // Other important less obivous properties for filtering:
        parentReportActionID: report.parentReportActionID,
        parentReportID: report.parentReportID,
        isDeletedParentAction: report.isDeletedParentAction,
        isUnreadWithMention: ReportUtils.isUnreadWithMention(report),
        customCacheKey: report.customCacheKey,
    }) as ChatReportSelector;

const reportActionsSelector = (reportActions: OnyxEntry<OnyxTypes.ReportActions>): ReportActionsSelector =>
    (reportActions &&
        Object.values(reportActions).map((reportAction) => {
            const {reportActionID, actionName, errors = [], originalMessage} = reportAction;
            const decision = reportAction.message?.[0]?.moderationDecision?.decision;

            return {
                reportActionID,
                actionName,
                errors,
                message: [
                    {
                        moderationDecision: {decision},
                    },
                ] as Message[],
                originalMessage,
            };
        })) as ReportActionsSelector;

const policySelector = (policy: OnyxEntry<OnyxTypes.Policy>): PolicySelector =>
    (policy && {
        type: policy.type,
        name: policy.name,
        avatarURL: policy.avatarURL,
        employeeList: policy.employeeList,
    }) as PolicySelector;

function ReportIDsContextProvider({
    children,
    /**
     * Only required to make unit tests work, since we
     * explicitly pass the currentReportID in LHNTestUtils
     * to SidebarLinksData, so this context doesn't have
     * access to currentReportID in that case.
     *
     * This is a workaround to have currentReportID available in testing environment.
     */
    currentReportIDForTests,
}: ReportIDsContextProviderProps) {
    console.time('ReportIDsContextProvider: init');

    console.time('useOnyx1');
    const [priorityMode] = useOnyx(ONYXKEYS.NVP_PRIORITY_MODE, {initialValue: CONST.PRIORITY_MODE.DEFAULT});
    console.timeEnd('useOnyx1');

    console.time('useOnyx2');
    const [chatReports] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {selector: chatReportSelector});
    console.timeEnd('useOnyx2');

    console.time('useOnyx3');
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: policySelector});
    console.timeEnd('useOnyx3');

    console.time('useOnyx4');
    const [allReportActions] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS, {selector: reportActionsSelector});
    console.timeEnd('useOnyx4');

    console.time('useOnyx5');
    const [transactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    console.timeEnd('useOnyx5');

    console.time('useOnyx6');
    const [reportsDrafts] = useOnyx(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT);
    console.timeEnd('useOnyx6');

    console.time('useOnyx7');
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    console.timeEnd('useOnyx7');

    console.time('useCurrentUserPersonalDetails');
    const {accountID} = useCurrentUserPersonalDetails();
    console.timeEnd('useCurrentUserPersonalDetails');

    console.time('useCurrentReportID');
    const currentReportIDValue = useCurrentReportID();
    console.timeEnd('useCurrentReportID');

    const derivedCurrentReportID = currentReportIDForTests ?? currentReportIDValue?.currentReportID;

    console.time('useActiveWorkspace');
    const {activeWorkspaceID} = useActiveWorkspace();
    console.timeEnd('useActiveWorkspace');

    console.time('getPolicyEmployeeListByIdWithoutCurrentUser');
    const policyMemberAccountIDs = getPolicyEmployeeListByIdWithoutCurrentUser(policies, activeWorkspaceID, accountID);
    console.timeEnd('getPolicyEmployeeListByIdWithoutCurrentUser');

    console.timeEnd('ReportIDsContextProvider: init');

    const getOrderedReportIDs = useCallback(
        (currentReportID?: string) => {
            console.time('getOrderedReportIDs');
            const result = SidebarUtils.getOrderedReportIDs(
                currentReportID ?? null,
                chatReports,
                betas,
                policies,
                priorityMode,
                allReportActions,
                transactionViolations,
                activeWorkspaceID,
                policyMemberAccountIDs,
            );
            console.timeEnd('getOrderedReportIDs');
            return result;
        },
        // we need reports draft in deps array for reloading of list when reportsDrafts will change
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [chatReports, betas, policies, priorityMode, allReportActions, transactionViolations, activeWorkspaceID, policyMemberAccountIDs, reportsDrafts],
    );

    const orderedReportIDs = useMemo(() => getOrderedReportIDs(), [getOrderedReportIDs]);
    const contextValue: ReportIDsContextValue = useMemo(() => {
        // We need to make sure the current report is in the list of reports, but we do not want
        // to have to re-generate the list every time the currentReportID changes. To do that
        // we first generate the list as if there was no current report, then we check if
        // the current report is missing from the list, which should very rarely happen. In this
        // case we re-generate the list a 2nd time with the current report included.
        if (derivedCurrentReportID && !orderedReportIDs.includes(derivedCurrentReportID)) {
            return {orderedReportIDs: getOrderedReportIDs(derivedCurrentReportID), currentReportID: derivedCurrentReportID ?? ''};
        }

        return {
            orderedReportIDs,
            currentReportID: derivedCurrentReportID ?? '',
        };
    }, [getOrderedReportIDs, orderedReportIDs, derivedCurrentReportID]);

    return <ReportIDsContext.Provider value={contextValue}>{children}</ReportIDsContext.Provider>;
}

function useReportIDs() {
    return useContext(ReportIDsContext);
}

export {ReportIDsContext, ReportIDsContextProvider, policySelector, useReportIDs};
export type {ChatReportSelector, PolicySelector, ReportActionsSelector};

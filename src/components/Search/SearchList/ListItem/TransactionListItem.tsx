// NOTE: The narrow-layout rendering of this component has a static twin in
// SearchStaticList (src/components/Search/SearchStaticList.tsx) used for fast
// perceived performance. If you change the narrow-layout UI here, verify the
// static version still looks visually identical.
import React, {useCallback, useRef} from 'react';
import type {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
// Use the original useOnyx hook to get the real-time data from Onyx and not from the snapshot
// eslint-disable-next-line no-restricted-imports
import {useOnyx as originalUseOnyx} from 'react-native-onyx';
import {getButtonRole} from '@components/Button/utils';
import {useDelegateNoAccessActions, useDelegateNoAccessState} from '@components/DelegateNoAccessModalProvider';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import {useSearchStateContext} from '@components/Search/SearchContext';
import type {ListItem} from '@components/SelectionList/types';
import TransactionItemRow from '@components/TransactionItemRow';
import useAnimatedHighlightStyle from '@hooks/useAnimatedHighlightStyle';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStableValue from '@hooks/useStableValue';
import useStyleUtils from '@hooks/useStyleUtils';
import useSyncFocus from '@hooks/useSyncFocus';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import type {TransactionPreviewData} from '@libs/actions/Search';
import {handleActionButtonPress as handleActionButtonPressUtil} from '@libs/actions/Search';
import {syncMissingAttendeesViolation} from '@libs/AttendeeUtils';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {isAttendeeTrackingEnabled} from '@libs/PolicyUtils';
import {isInvoiceReport} from '@libs/ReportUtils';
import {isViolationDismissed, mergeProhibitedViolations, shouldShowViolation} from '@libs/TransactionUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {isActionLoadingSelector} from '@src/selectors/ReportMetaData';
import type {Policy, Report, ReportAction, ReportActions} from '@src/types/onyx';
import type {TransactionViolation} from '@src/types/onyx/TransactionViolation';
import type {TransactionListItemProps, TransactionListItemType} from './types';
import UserInfoAndActionButtonRow from './UserInfoAndActionButtonRow';

// @track-refs
function TransactionListItem<TItem extends ListItem>({
    item: unstableItem,
    isFocused,
    showTooltip,
    isDisabled,
    canSelectMultiple,
    onSelectRow,
    onCheckboxPress,
    onFocus: unstableOnFocus,
    onLongPressRow,
    shouldSyncFocus,
    columns,
    isLoading,
    violations,
    customCardNames,
    lastPaymentMethod,
    personalPolicyID,
    isLastItem,
}: TransactionListItemProps<TItem>) {
    const transactionItem = unstableItem as unknown as TransactionListItemType;
    const styles = useThemeStyles();
    const theme = useTheme();
    const StyleUtils = useStyleUtils();

    const {isLargeScreenWidth, shouldUseNarrowLayout} = useResponsiveLayout();
    const {currentSearchHash, currentSearchKey, currentSearchResults: unstableCurrentSearchResults} = useSearchStateContext();
    const unstableSnapshotReport = (unstableCurrentSearchResults?.data?.[`${ONYXKEYS.COLLECTION.REPORT}${transactionItem.reportID}`] ?? {}) as Report;
    const snapshotReport = useStableValue(unstableSnapshotReport);

    const [unstableUserBillingGracePeriodEnds] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END);
    const userBillingGracePeriodEnds = useStableValue(unstableUserBillingGracePeriodEnds);
    const [isActionLoading] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_METADATA}${transactionItem.reportID}`, {selector: isActionLoadingSelector});

    // Use active policy (user's current workspace) as fallback for self DM tracking expenses
    // This matches MoneyRequestView's approach via usePolicyForMovingExpenses()
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const [ownerBillingGracePeriodEnd] = useOnyx(ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END);

    // Use report's policyID as fallback when transaction doesn't have policyID directly
    // Use active policy as final fallback for SelfDM (tracking expenses)
    // NOTE: Using || instead of ?? to treat empty string "" as falsy
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const policyID = transactionItem.policyID || snapshotReport?.policyID || activePolicyID;
    const [unstableParentPolicy] = originalUseOnyx(`${ONYXKEYS.COLLECTION.POLICY}${getNonEmptyStringOnyxID(policyID)}`);
    const parentPolicy = useStableValue(unstableParentPolicy);
    const unstableSnapshotPolicy = (unstableCurrentSearchResults?.data?.[`${ONYXKEYS.COLLECTION.POLICY}${transactionItem.policyID}`] ?? {}) as Policy;
    const snapshotPolicy = useStableValue(unstableSnapshotPolicy);

    const unstableActionsData = unstableCurrentSearchResults?.data?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${transactionItem.reportID}`];
    const actionsData = useStableValue(unstableActionsData);
    const unstableExportedReportActions = actionsData ? Object.values(actionsData) : [];
    const exportedReportActions = useStableValue(unstableExportedReportActions);

    // Fetch policy categories directly from Onyx since they are not included in the search snapshot
    const [policyCategories] = originalUseOnyx(`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${getNonEmptyStringOnyxID(policyID)}`);

    const [unstableParentReport] = originalUseOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getNonEmptyStringOnyxID(transactionItem.reportID)}`);
    const parentReport = useStableValue(unstableParentReport);
    const [unstableTransactionThreadReport] = originalUseOnyx(`${ONYXKEYS.COLLECTION.REPORT}${transactionItem?.reportAction?.childReportID}`);
    const transactionThreadReport = useStableValue(unstableTransactionThreadReport);
    const [unstableTransaction] = originalUseOnyx(`${ONYXKEYS.COLLECTION.TRANSACTION}${getNonEmptyStringOnyxID(transactionItem.transactionID)}`);
    const transaction = useStableValue(unstableTransaction);
    const reportActionID = transactionItem?.reportAction?.reportActionID;
    const parentReportActionSelector = useCallback((reportActions: OnyxEntry<ReportActions>): OnyxEntry<ReportAction> => reportActions?.[`${reportActionID}`], [reportActionID]);
    const [parentReportAction] = originalUseOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${getNonEmptyStringOnyxID(transactionItem.reportID)}`, {selector: parentReportActionSelector}, [
        transactionItem,
    ]);
    const currentUserDetails = useCurrentUserPersonalDetails();
    const unstableTransactionPreviewData: TransactionPreviewData = {
        hasParentReport: !!parentReport,
        hasTransaction: !!transaction,
        hasParentReportAction: !!parentReportAction,
        hasTransactionThreadReport: !!transactionThreadReport,
    };
    const transactionPreviewData = useStableValue(unstableTransactionPreviewData);

    const unstablePressableStyle = [
        styles.transactionListItemStyle,
        !isLargeScreenWidth && styles.pt3,
        unstableItem.isSelected && styles.activeComponentBG,
        isLargeScreenWidth
            ? {
                  ...styles.flexRow,
                  ...styles.justifyContentBetween,
                  ...styles.alignItemsCenter,
                  ...StyleUtils.getSearchTableRowPressableStyle(!!isLastItem, unstableItem.isSelected),
              }
            : {...styles.flexColumn, ...styles.alignItemsStretch},
    ];
    const pressableStyle = useStableValue(unstablePressableStyle);
    const unstableRowStyle = [styles.p3, styles.pv2, shouldUseNarrowLayout ? styles.pt2 : isLargeScreenWidth && styles.noBorderRadius];
    const rowStyle = useStableValue(unstableRowStyle);

    const animatedHighlightStyle = useAnimatedHighlightStyle({
        borderRadius: StyleUtils.getSearchTableHighlightBorderRadius(isLargeScreenWidth),
        shouldHighlight: unstableItem?.shouldAnimateInHighlight ?? false,
        highlightColor: theme.messageHighlightBG,
        backgroundColor: theme.highlightBG,
        shouldApplyOtherStyles: !isLargeScreenWidth,
    });

    const amountColumnSize = transactionItem.isAmountColumnWide ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
    const taxAmountColumnSize = transactionItem.isTaxAmountColumnWide ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
    const dateColumnSize = transactionItem.shouldShowYear ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
    const submittedColumnSize = transactionItem.shouldShowYearSubmitted ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
    const approvedColumnSize = transactionItem.shouldShowYearApproved ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
    const postedColumnSize = transactionItem.shouldShowYearPosted ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;
    const exportedColumnSize = transactionItem.shouldShowYearExported ? CONST.SEARCH.TABLE_COLUMN_SIZES.WIDE : CONST.SEARCH.TABLE_COLUMN_SIZES.NORMAL;

    // Prefer live Onyx policy data over snapshot to ensure fresh policy settings
    // like isAttendeeTrackingEnabled is not missing
    // Use snapshotReport/snapshotPolicy as fallbacks to fix offline issues where
    // newly created reports aren't in the search snapshot yet
    const policyForViolations = parentPolicy ?? snapshotPolicy;
    const reportForViolations = parentReport ?? snapshotReport;

    const unstableOnyxViolations = (violations?.[`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transactionItem.transactionID}`] ?? []).filter(
        (violation: TransactionViolation) =>
            !isViolationDismissed(transactionItem, violation, currentUserDetails.email ?? '', currentUserDetails.accountID, reportForViolations, policyForViolations) &&
            shouldShowViolation(reportForViolations, policyForViolations, violation.name, currentUserDetails.email ?? '', false, transactionItem),
    );
    const onyxViolations = useStableValue(unstableOnyxViolations);

    const isInvoice = isInvoiceReport(reportForViolations) || reportForViolations.type === CONST.REPORT.TYPE.INVOICE;
    // Sync missingAttendees violation with current policy category settings (can be removed later when BE handles this)
    // Use live transaction data (attendees, category) to ensure we check against current state, not stale snapshot
    const attendeeOnyxViolations = syncMissingAttendeesViolation(
        onyxViolations,
        policyCategories,
        transaction?.category ?? transactionItem.category ?? '',
        transaction?.comment?.attendees ?? transactionItem.attendees,
        currentUserDetails,
        isAttendeeTrackingEnabled(policyForViolations),
        policyForViolations?.type === CONST.POLICY.TYPE.CORPORATE,
        isInvoice,
    );

    const transactionViolations = mergeProhibitedViolations(attendeeOnyxViolations);

    const {isDelegateAccessRestricted} = useDelegateNoAccessState();
    const {showDelegateNoAccessModal} = useDelegateNoAccessActions();

    const unstableHandleActionButtonPressDepsRef = useRef({
        currentSearchHash,
        transactionItem,
        onSelectRow,
        item: unstableItem,
        transactionPreviewData,
        snapshotReport,
        snapshotPolicy,
        lastPaymentMethod,
        userBillingGracePeriodEnds,
        currentSearchKey,
        isDelegateAccessRestricted,
        showDelegateNoAccessModal,
        personalPolicyID,
        ownerBillingGracePeriodEnd,
    });
    // eslint-disable-next-line react-hooks/refs -- writing latest values for stable callback pattern
    unstableHandleActionButtonPressDepsRef.current = {
        currentSearchHash,
        transactionItem,
        onSelectRow,
        item: unstableItem,
        transactionPreviewData,
        snapshotReport,
        snapshotPolicy,
        lastPaymentMethod,
        userBillingGracePeriodEnds,
        currentSearchKey,
        isDelegateAccessRestricted,
        showDelegateNoAccessModal,
        personalPolicyID,
        ownerBillingGracePeriodEnd,
    };

    const handleActionButtonPress = useCallback(() => {
        const deps = unstableHandleActionButtonPressDepsRef.current;
        handleActionButtonPressUtil({
            hash: deps.currentSearchHash,
            item: deps.transactionItem,
            goToItem: () => deps.onSelectRow(deps.item, deps.transactionPreviewData),
            snapshotReport: deps.snapshotReport,
            snapshotPolicy: deps.snapshotPolicy,
            lastPaymentMethod: deps.lastPaymentMethod,
            userBillingGracePeriodEnds: deps.userBillingGracePeriodEnds,
            currentSearchKey: deps.currentSearchKey,
            isDelegateAccessRestricted: deps.isDelegateAccessRestricted,
            onDelegateAccessRestricted: deps.showDelegateNoAccessModal,
            personalPolicyID: deps.personalPolicyID,
            ownerBillingGracePeriodEnd: deps.ownerBillingGracePeriodEnd,
        });
    }, []);

    const unstableInlineCallbackDepsRef = useRef({onCheckboxPress, onSelectRow, item: unstableItem, transactionPreviewData, onLongPressRow, onFocus: unstableOnFocus});
    // eslint-disable-next-line react-hooks/refs -- writing latest values for stable callback pattern
    unstableInlineCallbackDepsRef.current = {onCheckboxPress, onSelectRow, item: unstableItem, transactionPreviewData, onLongPressRow, onFocus: unstableOnFocus};

    const stableOnCheckboxPress = useCallback(() => unstableInlineCallbackDepsRef.current.onCheckboxPress?.(unstableInlineCallbackDepsRef.current.item), []);
    const stableOnArrowRightPress = useCallback(() => {
        const deps = unstableInlineCallbackDepsRef.current;
        deps.onSelectRow(deps.item, deps.transactionPreviewData);
    }, []);
    const stableOnPress = useCallback(() => {
        const deps = unstableInlineCallbackDepsRef.current;
        deps.onSelectRow(deps.item, deps.transactionPreviewData);
    }, []);
    const stableOnLongPress = useCallback(() => unstableInlineCallbackDepsRef.current.onLongPressRow?.(unstableInlineCallbackDepsRef.current.item), []);
    const stableOnFocus = useCallback((...args: Parameters<NonNullable<typeof unstableOnFocus>>) => unstableInlineCallbackDepsRef.current.onFocus?.(...args), []);

    const pressableRef = useRef<View>(null);

    useSyncFocus(pressableRef, !!isFocused, shouldSyncFocus);

    return (
        <OfflineWithFeedback pendingAction={unstableItem.pendingAction}>
            <PressableWithFeedback
                ref={pressableRef}
                onLongPress={stableOnLongPress}
                onPress={stableOnPress}
                disabled={isDisabled && !unstableItem.isSelected}
                accessibilityLabel={unstableItem.text ?? ''}
                role={getButtonRole(true)}
                isNested
                onMouseDown={(e) => e.preventDefault()}
                hoverStyle={[!unstableItem.isDisabled && styles.hoveredComponentBG, unstableItem.isSelected && styles.activeComponentBG]}
                dataSet={{[CONST.SELECTION_SCRAPER_HIDDEN_ELEMENT]: true, [CONST.INNER_BOX_SHADOW_ELEMENT]: false}}
                id={unstableItem.keyForList ?? ''}
                sentryLabel={CONST.SENTRY_LABEL.SEARCH.TRANSACTION_LIST_ITEM}
                style={[
                    pressableStyle,
                    isFocused && StyleUtils.getItemBackgroundColorStyle(!!unstableItem.isSelected, !!isFocused, !!unstableItem.isDisabled, theme.activeComponentBG, theme.hoverComponentBG),
                ]}
                onFocus={stableOnFocus}
                wrapperStyle={[
                    !isLargeScreenWidth && styles.mb2,
                    styles.mh5,
                    styles.flex1,
                    animatedHighlightStyle,
                    styles.userSelectNone,
                    isLargeScreenWidth && isLastItem && [styles.searchTableBottomRadius, styles.overflowHidden],
                ]}
            >
                {({hovered}) => (
                    <>
                        {!isLargeScreenWidth && (
                            <UserInfoAndActionButtonRow
                                item={transactionItem}
                                handleActionButtonPress={handleActionButtonPress}
                                shouldShowUserInfo={!!transactionItem?.from}
                                isInMobileSelectionMode={shouldUseNarrowLayout && !!canSelectMultiple}
                                isDisabledItem={!!isDisabled}
                            />
                        )}
                        <TransactionItemRow
                            transactionItem={transactionItem}
                            report={transactionItem.report}
                            policy={transactionItem.policy}
                            shouldShowTooltip={showTooltip}
                            onButtonPress={handleActionButtonPress}
                            onCheckboxPress={stableOnCheckboxPress}
                            shouldUseNarrowLayout={!isLargeScreenWidth}
                            isLargeScreenWidth={isLargeScreenWidth}
                            columns={columns}
                            isActionLoading={isLoading ?? isActionLoading}
                            isSelected={!!transactionItem.isSelected}
                            isDisabled={!!isDisabled}
                            dateColumnSize={dateColumnSize}
                            submittedColumnSize={submittedColumnSize}
                            approvedColumnSize={approvedColumnSize}
                            postedColumnSize={postedColumnSize}
                            exportedColumnSize={exportedColumnSize}
                            amountColumnSize={amountColumnSize}
                            taxAmountColumnSize={taxAmountColumnSize}
                            shouldShowCheckbox={!!canSelectMultiple}
                            checkboxSentryLabel={CONST.SENTRY_LABEL.SEARCH.TRANSACTION_LIST_ITEM_CHECKBOX}
                            style={rowStyle}
                            violations={transactionViolations}
                            onArrowRightPress={stableOnArrowRightPress}
                            isHover={hovered}
                            customCardNames={customCardNames}
                            reportActions={exportedReportActions}
                        />
                    </>
                )}
            </PressableWithFeedback>
        </OfflineWithFeedback>
    );
}

export default TransactionListItem;

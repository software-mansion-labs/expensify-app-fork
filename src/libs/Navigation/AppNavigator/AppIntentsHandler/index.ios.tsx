import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDefaultExpensePolicy from '@hooks/useDefaultExpensePolicy';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import usePersonalPolicy from '@hooks/usePersonalPolicy';

import {initGpsDraft} from '@libs/actions/GPSDraftDetails';
import {clearMoneyRequest, initMoneyRequest, setMoneyRequestAmount, setMoneyRequestMerchant, startMoneyRequest} from '@libs/actions/IOU/MoneyRequest';
import {convertToBackendAmount} from '@libs/CurrencyUtils';
import DistanceRequestUtils from '@libs/DistanceRequestUtils';
import {getGpsPoints, stopGpsTrip} from '@libs/GPSDraftDetailsUtils';
import Log from '@libs/Log';
import Navigation from '@libs/Navigation/Navigation';
import {generateReportID} from '@libs/ReportUtils';

import {BACKGROUND_LOCATION_TASK_OPTIONS, BACKGROUND_LOCATION_TRACKING_TASK_NAME} from '@pages/iou/request/step/IOURequestStepDistanceGPS/const';
import {startGpsTripNotification} from '@pages/iou/request/step/IOURequestStepDistanceGPS/GPSNotifications';

import Tab from '@userActions/Tab';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import type {AppIntentInvocation} from 'expo-app-intents';

import {hasOnlyPersonalPoliciesSelector} from '@selectors/Policy';
import {validTransactionDraftIDsSelector} from '@selectors/TransactionDraft';
import {removePendingInvocationAsync, useAppIntents} from 'expo-app-intents';
import {getBackgroundPermissionsAsync, getForegroundPermissionsAsync, hasServicesEnabledAsync, hasStartedLocationUpdatesAsync, startLocationUpdatesAsync} from 'expo-location';
import React, {useRef, useState} from 'react';

import type {ExpensesEdit, ExpensesEditGroup} from './types';

import AppIntentsCatalogPublisher from './AppIntentsCatalogPublisher';
import ApplyExpensesEdit from './ApplyExpensesEdit';
import {APP_INTENT_NAMES} from './types';

function getStringParam(invocation: AppIntentInvocation, key: string): string | undefined {
    const value = invocation.params[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumberParam(invocation: AppIntentInvocation, key: string): number | undefined {
    const value = invocation.params[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Reads the per-workspace groups of an editExpenses invocation, dropping any group Swift sent without expenses */
function getEditGroups(invocation: AppIntentInvocation): ExpensesEditGroup[] {
    const groups: unknown = invocation.params.groups;
    if (!Array.isArray(groups)) {
        return [];
    }
    return groups.flatMap((group: unknown) => {
        if (!isRecord(group)) {
            return [];
        }
        const policyID = toOptionalString(group.policyID);
        const ids: unknown = group.transactionIDs;
        const transactionIDs = Array.isArray(ids) ? ids.filter((id: unknown): id is string => typeof id === 'string' && !!id) : [];
        if (!policyID || transactionIDs.length === 0) {
            return [];
        }
        return [{policyID, transactionIDs, category: toOptionalString(group.category), tag: toOptionalString(group.tag)}];
    });
}

/**
 * Siri can run a request while another flow is open in the right-hand pane. Opening a create-expense tab on top of it
 * would reuse that pane's tab navigator, which cannot push a screen, so the pane is closed first.
 */
function runAfterClosingModal(callback: () => void) {
    if (!Navigation.isTopmostRouteModalScreen()) {
        callback();
        return;
    }
    Navigation.dismissModal({afterTransition: callback});
}

/**
 * Runs the Siri and Shortcuts App Intents declared in Mobile-Expensify/iOS/Expensify/AppIntents. Swift queues every
 * invocation, so the ones received while NewDot was not running are handled here as soon as the user is signed in.
 */
function AppIntentsHandler() {
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const personalPolicy = usePersonalPolicy();
    const defaultExpensePolicy = useDefaultExpensePolicy();
    const [draftTransactionIDs] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_DRAFT, {selector: validTransactionDraftIDsSelector});
    const [hasOnlyPersonalPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: hasOnlyPersonalPoliciesSelector});
    const [currentDate] = useOnyx(ONYXKEYS.CURRENT_DATE);
    const [gpsDraftDetails] = useOnyx(ONYXKEYS.GPS_DRAFT_DETAILS);
    const [expensesEdit, setExpensesEdit] = useState<ExpensesEdit>();

    // Delivery is at-least-once, so an invocation can arrive again before its removal from the native queue lands.
    const handledInvocationIDs = useRef(new Set<string>());

    const scanReceipt = () => {
        Tab.setSelectedTab(CONST.TAB.IOU_REQUEST_TYPE, CONST.IOU.REQUEST_TYPE.SCAN);
        startMoneyRequest(CONST.IOU.TYPE.CREATE, generateReportID(), draftTransactionIDs, CONST.IOU.REQUEST_TYPE.SCAN, false, undefined, true);
    };

    // Builds the manual expense draft before opening the Manual tab, so the start page finds it already initialized
    // for this reportID and keeps the amount and merchant instead of resetting the draft. It runs only after an open
    // flow is closed, so that flow's cleanup cannot clear the new draft.
    const logExpense = (amount: number, currency: string | undefined, merchant: string | undefined) => {
        const reportID = generateReportID();
        const transactionID = CONST.IOU.OPTIMISTIC_TRANSACTION_ID;
        const expenseCurrency = currency ?? defaultExpensePolicy?.outputCurrency ?? personalPolicy?.outputCurrency ?? CONST.CURRENCY.USD;

        clearMoneyRequest(transactionID, draftTransactionIDs);
        initMoneyRequest({
            reportID,
            policy: defaultExpensePolicy,
            personalPolicy,
            isFromGlobalCreate: true,
            isFromFloatingActionButton: true,
            newIouRequestType: CONST.IOU.REQUEST_TYPE.MANUAL,
            report: undefined,
            parentReport: undefined,
            currentDate,
            overrideCurrency: expenseCurrency,
            hasOnlyPersonalPolicies: hasOnlyPersonalPolicies ?? true,
            draftTransactionIDs,
        });
        setMoneyRequestAmount(transactionID, convertToBackendAmount(amount), expenseCurrency);
        if (merchant) {
            setMoneyRequestMerchant(transactionID, merchant, true);
        }

        Tab.setSelectedTab(CONST.TAB.IOU_REQUEST_TYPE, CONST.IOU.REQUEST_TYPE.MANUAL);
        Navigation.navigate(ROUTES.MONEY_REQUEST_CREATE_TAB_MANUAL.getRoute(CONST.IOU.ACTION.CREATE, CONST.IOU.TYPE.CREATE, transactionID, reportID));
    };

    const navigateToGpsScreen = (reportID: string) => {
        runAfterClosingModal(() =>
            Navigation.navigate(ROUTES.DISTANCE_REQUEST_CREATE_TAB_GPS.getRoute(CONST.IOU.ACTION.CREATE, CONST.IOU.TYPE.CREATE, CONST.IOU.OPTIMISTIC_TRANSACTION_ID, reportID)),
        );
    };

    // Starts tracking right away when location access was already granted. Otherwise it only opens the GPS screen,
    // where the Start button walks the user through the permission prompts.
    const startTrip = async () => {
        if (gpsDraftDetails?.isTracking) {
            navigateToGpsScreen(gpsDraftDetails.reportID ?? generateReportID());
            return;
        }

        const reportID = generateReportID();
        const [areServicesEnabled, foregroundPermission, backgroundPermission] = await Promise.all([
            hasServicesEnabledAsync(),
            getForegroundPermissionsAsync(),
            getBackgroundPermissionsAsync(),
        ]);

        if (areServicesEnabled && foregroundPermission.granted && backgroundPermission.granted) {
            try {
                if (!(await hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME))) {
                    await startLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME, BACKGROUND_LOCATION_TASK_OPTIONS);
                }
                const unit = DistanceRequestUtils.getRate({
                    transaction: undefined,
                    policy: defaultExpensePolicy,
                    useTransactionDistanceUnit: false,
                    personalPolicyOutputCurrency: personalPolicy?.outputCurrency,
                }).unit;
                initGpsDraft(reportID, unit, currentUserPersonalDetails.accountID);
                startGpsTripNotification(translate, reportID, unit);
            } catch (error) {
                Log.warn('[AppIntents] Could not start the GPS trip', {error});
            }
        }

        navigateToGpsScreen(reportID);
    };

    const stopTrip = () => {
        if (gpsDraftDetails?.isTracking) {
            stopGpsTrip(isOffline, getGpsPoints(gpsDraftDetails));
        }
        navigateToGpsScreen(gpsDraftDetails?.reportID ?? generateReportID());
    };

    const handleInvocation = async (invocation: AppIntentInvocation) => {
        switch (invocation.name) {
            case APP_INTENT_NAMES.SCAN_RECEIPT:
                runAfterClosingModal(scanReceipt);
                return;
            case APP_INTENT_NAMES.LOG_EXPENSE: {
                const amount = getNumberParam(invocation, 'amount');
                if (amount === undefined) {
                    return;
                }
                runAfterClosingModal(() => logExpense(amount, getStringParam(invocation, 'currency'), getStringParam(invocation, 'merchant')));
                return;
            }
            case APP_INTENT_NAMES.SHOW_EXPENSES: {
                const query = getStringParam(invocation, 'query');
                if (query) {
                    runAfterClosingModal(() => Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query})));
                }
                return;
            }
            case APP_INTENT_NAMES.EDIT_EXPENSES: {
                const groups = getEditGroups(invocation);
                const description = getStringParam(invocation, 'description');
                if (groups.length > 0 && (!!description || groups.some((group) => !!(group.category ?? group.tag)))) {
                    // Closing an open flow first keeps its cleanup from racing the edit, as for the other requests
                    runAfterClosingModal(() => setExpensesEdit({invocationID: invocation.id, groups, description, query: getStringParam(invocation, 'query')}));
                }
                return;
            }
            case APP_INTENT_NAMES.START_TRIP:
                await startTrip();
                return;
            case APP_INTENT_NAMES.STOP_TRIP:
                stopTrip();
                return;
            default:
                Log.warn('[AppIntents] Received an unknown invocation', {name: invocation.name});
        }
    };

    useAppIntents(async (pendingIntents) => {
        await Navigation.waitForProtectedRoutes();

        for (const invocation of pendingIntents) {
            if (!handledInvocationIDs.current.has(invocation.id)) {
                handledInvocationIDs.current.add(invocation.id);
                try {
                    // eslint-disable-next-line no-await-in-loop -- requests queued while the app was closed run in the order the user made them
                    await handleInvocation(invocation);
                } catch (error) {
                    Log.warn('[AppIntents] Could not handle the invocation', {name: invocation.name, error});
                }
            }
            // eslint-disable-next-line no-await-in-loop -- removed only after it ran, so a crash mid-way leaves the rest queued
            await removePendingInvocationAsync(invocation.id);
        }
    });

    return (
        <>
            <AppIntentsCatalogPublisher />
            {!!expensesEdit && (
                <ApplyExpensesEdit
                    key={expensesEdit.invocationID}
                    edit={expensesEdit}
                    onDone={() => setExpensesEdit(undefined)}
                />
            )}
        </>
    );
}

export default AppIntentsHandler;

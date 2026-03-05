import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useRef} from 'react';
import type {LayoutChangeEvent} from 'react-native';
import type {ValueOf} from 'type-fest';
import {getPendingExpenseCreateDestination, markSubmitToDestinationVisibleEnd} from '@libs/telemetry/submitToDestinationVisible';
import type {DestinationType} from '@libs/telemetry/submitToDestinationVisible';
import CONST from '@src/CONST';

type Trigger = ValueOf<typeof CONST.TELEMETRY.SUBMIT_TO_DESTINATION_VISIBLE_TRIGGER>;

/**
 * End the submit-to-destination-visible span when the destination becomes visible.
 * - trigger FOCUS: ends the span when the screen gains focus (e.g. ReportScreen for REPORT_CHAT / RHP_POP).
 * - trigger LAYOUT: returns a callback to attach to onLayout; ends the span when layout runs (e.g. SearchMoneyRequestReportPage for MONEY_REQUEST_RHP / RHP_POP).
 * Resets the "already ended" guard on blur so the next visit can end the span again.
 */
function useSubmitToDestinationVisible(
    destinationTypes: readonly DestinationType[],
    reportID: string | undefined,
    trigger: typeof CONST.TELEMETRY.SUBMIT_TO_DESTINATION_VISIBLE_TRIGGER.FOCUS,
): void;
function useSubmitToDestinationVisible(
    destinationTypes: readonly DestinationType[],
    reportID: string | undefined,
    trigger: typeof CONST.TELEMETRY.SUBMIT_TO_DESTINATION_VISIBLE_TRIGGER.LAYOUT,
): (event?: LayoutChangeEvent) => void;
function useSubmitToDestinationVisible(destinationTypes: readonly DestinationType[], reportID: string | undefined, trigger: Trigger): void | ((event?: LayoutChangeEvent) => void) {
    const hasEndedRef = useRef(false);

    const tryEnd = useCallback(() => {
        if (hasEndedRef.current) {
            return;
        }
        const pending = getPendingExpenseCreateDestination();
        if (!pending || !destinationTypes.includes(pending.destinationType)) {
            return;
        }
        if (pending.reportID !== undefined && pending.reportID !== reportID) {
            return;
        }
        hasEndedRef.current = true;
        markSubmitToDestinationVisibleEnd(pending.destinationType, reportID);
    }, [destinationTypes, reportID]);

    const reset = useCallback(() => {
        hasEndedRef.current = false;
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (trigger === CONST.TELEMETRY.SUBMIT_TO_DESTINATION_VISIBLE_TRIGGER.FOCUS && reportID) {
                tryEnd();
            }
            return reset;
        }, [trigger, reportID, tryEnd, reset]),
    );

    return trigger === CONST.TELEMETRY.SUBMIT_TO_DESTINATION_VISIBLE_TRIGGER.LAYOUT ? tryEnd : undefined;
}

export default useSubmitToDestinationVisible;

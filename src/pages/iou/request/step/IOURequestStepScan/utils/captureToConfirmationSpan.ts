import {startSpan} from '@libs/telemetry/activeSpans';
import {getPickerCaptureSource} from '@libs/telemetry/ReceiptObservability';

import CONST from '@src/CONST';

/**
 * Epoch ms of the moment the last receipt entered the app through the file picker or the drag-and-drop zone.
 * The web upload path has no shutter press, so this is where its capture-to-confirmation flow begins.
 */
let pickedAtTimestamp: number | undefined;

/** Records that receipts just came in from the picker or the drop zone. */
function markReceiptPicked() {
    pickedAtTimestamp = Date.now();
}

/** Drops a recorded pick, so a later flow can't be backdated to it. */
function clearReceiptPickMark() {
    pickedAtTimestamp = undefined;
}

/**
 * Starts the shutter-to-confirmation span for the upload path, backdated to the moment the files were picked,
 * so it also covers file validation.
 *
 * It runs right before the flow navigates instead of at pick time: a validation error keeps the user on the scan
 * step, and a parent span left open there is ended by the next confirmation mount of the session, which stamps
 * that whole detour onto the metric.
 *
 * Nothing happens without a recorded pick, so the camera path keeps the span it started on the shutter press.
 */
function startCaptureToConfirmationSpanFromPick(isMultiScanEnabled: boolean) {
    const startTime = pickedAtTimestamp;
    clearReceiptPickMark();

    // Multi scan submits a batch minutes after the files were picked, so the span would measure how long the user
    // spent reviewing the batch. The camera path skips the span for the same reason.
    if (startTime === undefined || isMultiScanEnabled) {
        return;
    }

    startSpan(CONST.TELEMETRY.SPAN_SHUTTER_TO_CONFIRMATION, {
        name: CONST.TELEMETRY.SPAN_SHUTTER_TO_CONFIRMATION,
        op: CONST.TELEMETRY.SPAN_SHUTTER_TO_CONFIRMATION,
        startTime,
        attributes: {[CONST.TELEMETRY.ATTRIBUTE_PLATFORM]: 'web', [CONST.TELEMETRY.ATTRIBUTE_SOURCE]: getPickerCaptureSource()},
    });
}

export {markReceiptPicked, clearReceiptPickMark, startCaptureToConfirmationSpanFromPick};

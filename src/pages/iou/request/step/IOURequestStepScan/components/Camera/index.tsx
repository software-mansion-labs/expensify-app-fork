import {isMobile} from '@libs/Browser';
import {cancelSpan, endSpan} from '@libs/telemetry/activeSpans';

import {markReceiptPicked} from '@pages/iou/request/step/IOURequestStepScan/utils/captureToConfirmationSpan';

import CONST from '@src/CONST';

import React, {useEffect} from 'react';

import type {CameraProps} from './types';

import CameraCapture from './CameraCapture';
import FileUpload from './FileUpload';

/**
 * Camera — web entry point.
 * On mobile browsers renders a camera viewfinder (CameraCapture).
 * On desktop browsers renders a drag-and-drop / file-picker upload area (FileUpload).
 */
function Camera(props: CameraProps) {
    // The upload path has no shutter press, so the picked files are what starts its capture-to-confirmation flow.
    const onPicked: CameraProps['onPicked'] = (files, items) => {
        markReceiptPicked();
        props.onPicked(files, items);
    };

    // End telemetry spans on mount for web (no camera init tracking needed)
    useEffect(() => {
        endSpan(CONST.TELEMETRY.SPAN_OPEN_CREATE_EXPENSE);
        endSpan(CONST.TELEMETRY.SPAN_ENTRY_TO_SCAN_NAVIGATION);
        endSpan(CONST.TELEMETRY.SPAN_ENTRY_TO_SCAN);

        return () => {
            cancelSpan(CONST.TELEMETRY.SPAN_ENTRY_TO_SCAN_NAVIGATION);
            cancelSpan(CONST.TELEMETRY.SPAN_ENTRY_TO_SCAN);
        };
    }, []);
    if (isMobile()) {
        return (
            <CameraCapture
                // Props are forwarded to the platform-specific Camera variant, with onPicked wrapped for telemetry

                {...props}
                onPicked={onPicked}
            />
        );
    }

    return (
        <FileUpload
            // Props are forwarded to the platform-specific Camera variant, with onPicked wrapped for telemetry

            {...props}
            onPicked={onPicked}
        />
    );
}

Camera.displayName = 'Camera';

export default Camera;

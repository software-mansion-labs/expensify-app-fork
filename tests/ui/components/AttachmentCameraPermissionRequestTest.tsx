import {act, render} from '@testing-library/react-native';

import AttachmentCamera from '@components/AttachmentPicker/AttachmentCamera';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import React, {Activity, StrictMode} from 'react';
import Onyx from 'react-native-onyx';
import {RESULTS} from 'react-native-permissions';

import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const mockGetCameraPermissionStatus = jest.fn<Promise<string>, []>();
const mockRequestCameraPermission = jest.fn<Promise<string>, []>();

jest.mock('@pages/iou/request/step/IOURequestStepScan/CameraPermission', () => ({
    getCameraPermissionStatus: () => mockGetCameraPermissionStatus(),
    requestCameraPermission: () => mockRequestCameraPermission(),
}));

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ignore for testing
const {View: MockView} = jest.requireActual('react-native');
jest.mock(
    '@components/Modal',
    () =>
        ({isVisible, children}: {isVisible: boolean; children: React.ReactNode}) =>
            isVisible ? <MockView>{children}</MockView> : null,
);

jest.mock('react-native-vision-camera', () => {
    const actualReact = jest.requireActual<typeof React>('react');
    return {
        useCameraDevice: jest.fn(() => undefined),
        useCameraDevices: jest.fn(() => []),
        useCameraFormat: jest.fn(() => null),
        Camera: actualReact.forwardRef(() => null),
    };
});

let pendingStatusReads: Array<() => void> = [];

function holdStatusReads() {
    mockGetCameraPermissionStatus.mockImplementation(
        () =>
            new Promise((resolve) => {
                pendingStatusReads.push(() => resolve(RESULTS.DENIED));
            }),
    );
}

async function resolvePendingStatusReads() {
    const reads = pendingStatusReads;
    pendingStatusReads = [];
    for (const resolveRead of reads) {
        resolveRead();
    }
    await waitForBatchedUpdatesWithAct();
}

const noop = () => {};

describe('AttachmentCamera camera permission auto-request', () => {
    beforeAll(() => {
        Onyx.init({keys: {}});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        pendingStatusReads = [];
        mockGetCameraPermissionStatus.mockResolvedValue(RESULTS.DENIED);
        mockRequestCameraPermission.mockResolvedValue(RESULTS.DENIED);
        await act(async () => {
            await Onyx.clear();
        });
    });

    it('requests exactly once when a visible camera mounts under StrictMode', async () => {
        // Given a denied permission and StrictMode, which runs setup, cleanup and setup before the first read resolves
        // When the camera mounts visible
        render(
            <StrictMode>
                <OnyxListItemProvider>
                    <LocaleContextProvider>
                        <AttachmentCamera
                            isVisible
                            onCapture={noop}
                            onClose={noop}
                            onModalHide={noop}
                        />
                    </LocaleContextProvider>
                </OnyxListItemProvider>
            </StrictMode>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the cancelled first read does not swallow the request of this opening
        expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);
    });

    it('requests exactly once when the camera is hidden and revealed while the status read is pending', async () => {
        // Given a denied permission whose status reads stay pending until the test resolves them
        holdStatusReads();
        const {rerender} = render(
            <Activity mode="visible">
                <OnyxListItemProvider>
                    <LocaleContextProvider>
                        <AttachmentCamera
                            isVisible
                            onCapture={noop}
                            onClose={noop}
                            onModalHide={noop}
                        />
                    </LocaleContextProvider>
                </OnyxListItemProvider>
            </Activity>,
        );

        // When the screen hides and reveals before the first read resolves
        rerender(
            <Activity mode="hidden">
                <OnyxListItemProvider>
                    <LocaleContextProvider>
                        <AttachmentCamera
                            isVisible
                            onCapture={noop}
                            onClose={noop}
                            onModalHide={noop}
                        />
                    </LocaleContextProvider>
                </OnyxListItemProvider>
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <OnyxListItemProvider>
                    <LocaleContextProvider>
                        <AttachmentCamera
                            isVisible
                            onCapture={noop}
                            onClose={noop}
                            onModalHide={noop}
                        />
                    </LocaleContextProvider>
                </OnyxListItemProvider>
            </Activity>,
        );
        await resolvePendingStatusReads();

        // Then the read of the reveal still requests, since the hide cancelled the first one
        expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);
    });

    it('does not request again when the camera is hidden and revealed after the status read finished', async () => {
        // Given a visible camera that already read the denied status and requested once
        const {rerender} = render(
            <Activity mode="visible">
                <OnyxListItemProvider>
                    <LocaleContextProvider>
                        <AttachmentCamera
                            isVisible
                            onCapture={noop}
                            onClose={noop}
                            onModalHide={noop}
                        />
                    </LocaleContextProvider>
                </OnyxListItemProvider>
            </Activity>,
        );
        await waitForBatchedUpdatesWithAct();
        expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);

        // When the screen hides and reveals on the same opening
        rerender(
            <Activity mode="hidden">
                <OnyxListItemProvider>
                    <LocaleContextProvider>
                        <AttachmentCamera
                            isVisible
                            onCapture={noop}
                            onClose={noop}
                            onModalHide={noop}
                        />
                    </LocaleContextProvider>
                </OnyxListItemProvider>
            </Activity>,
        );
        await waitForBatchedUpdatesWithAct();
        rerender(
            <Activity mode="visible">
                <OnyxListItemProvider>
                    <LocaleContextProvider>
                        <AttachmentCamera
                            isVisible
                            onCapture={noop}
                            onClose={noop}
                            onModalHide={noop}
                        />
                    </LocaleContextProvider>
                </OnyxListItemProvider>
            </Activity>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the reveal only refreshes the status and does not prompt a second time
        expect(mockGetCameraPermissionStatus).toHaveBeenCalledTimes(2);
        expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);
    });

    it('requests again when the camera is closed and reopened', async () => {
        // Given a visible camera that already requested once
        const {rerender} = render(
            <OnyxListItemProvider>
                <LocaleContextProvider>
                    <AttachmentCamera
                        isVisible
                        onCapture={noop}
                        onClose={noop}
                        onModalHide={noop}
                    />
                </LocaleContextProvider>
            </OnyxListItemProvider>,
        );
        await waitForBatchedUpdatesWithAct();
        expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);

        // When the camera closes and opens again on the same instance
        rerender(
            <OnyxListItemProvider>
                <LocaleContextProvider>
                    <AttachmentCamera
                        isVisible={false}
                        onCapture={noop}
                        onClose={noop}
                        onModalHide={noop}
                    />
                </LocaleContextProvider>
            </OnyxListItemProvider>,
        );
        await waitForBatchedUpdatesWithAct();
        rerender(
            <OnyxListItemProvider>
                <LocaleContextProvider>
                    <AttachmentCamera
                        isVisible
                        onCapture={noop}
                        onClose={noop}
                        onModalHide={noop}
                    />
                </LocaleContextProvider>
            </OnyxListItemProvider>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the new opening auto-requests on its own
        expect(mockRequestCameraPermission).toHaveBeenCalledTimes(2);
    });
});

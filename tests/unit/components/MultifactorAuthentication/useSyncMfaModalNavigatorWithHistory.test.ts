import {act, renderHook} from '@testing-library/react-native';

import type {MfaModalState} from '@components/MultifactorAuthentication/machine';
import useSyncMfaModalNavigatorWithHistory from '@components/MultifactorAuthentication/useSyncMfaModalNavigatorWithHistory';

import getPlatform from '@libs/getPlatform';
import {isMfaMarkerStripInProgress, popAndRealignMfaMarker} from '@libs/Navigation/helpers/mfaModalMarkerPreservation';

import CONST from '@src/CONST';

import {BackHandler} from 'react-native';
import waitForBatchedUpdates from 'tests/utils/waitForBatchedUpdates';

type RootState = {history: unknown[]};

let mockRootState: RootState = {history: []};
const mockStateListeners = new Set<() => void>();
const mockDispatch = jest.fn<void, [{type: string; payload?: unknown}]>();

jest.mock('@libs/getPlatform', () => ({__esModule: true, default: jest.fn()}));

// The root navigator is driven by hand: `state` events fire when a test changes the root history.
jest.mock('@libs/Navigation/navigationRef', () => ({
    __esModule: true,
    default: {
        isReady: () => true,
        getRootState: () => mockRootState,
        dispatch: (action: {type: string; payload?: unknown}) => {
            mockDispatch(action);
        },
        addListener: (_type: string, listener: () => void) => {
            mockStateListeners.add(listener);
            return () => mockStateListeners.delete(listener);
        },
    },
}));

jest.mock('@libs/Navigation/Navigation', () => ({__esModule: true, default: {isNavigationReady: () => Promise.resolve()}}));

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;
const MFA_MARKER = CONST.NAVIGATION.CUSTOM_HISTORY_ENTRY_MFA_MODAL_NAVIGATOR;
const TOGGLE_ACTION = CONST.NAVIGATION.ACTION_TYPE.TOGGLE_MFA_MODAL_NAVIGATOR_WITH_HISTORY;

const getPlatformMock = jest.mocked(getPlatform);

function setRootHistory(history: unknown[]) {
    mockRootState = {history};
    act(() => {
        for (const listener of mockStateListeners) {
            listener();
        }
    });
}

function markerToggles() {
    return mockDispatch.mock.calls.flatMap(([action]) => (action.type === TOGGLE_ACTION ? [action.payload] : []));
}

async function renderOpenHook(requestCancel: () => void) {
    mockRootState = {history: ['SomeScreen', MFA_MARKER]};
    const initialProps: {modalState: MfaModalState} = {modalState: MFA_STATE.OPEN};
    const hook = renderHook(({modalState}) => useSyncMfaModalNavigatorWithHistory(modalState, requestCancel), {initialProps});
    await waitForBatchedUpdates();
    mockDispatch.mockClear();
    return hook;
}

describe('useSyncMfaModalNavigatorWithHistory', () => {
    let hardwareBackHandler: (() => boolean | null | undefined) | undefined;
    const removeBackSubscription = jest.fn();
    let addBackListenerSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockStateListeners.clear();
        hardwareBackHandler = undefined;
        getPlatformMock.mockReturnValue(CONST.PLATFORM.WEB);
        addBackListenerSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_eventName, handler) => {
            hardwareBackHandler = handler;
            return {remove: removeBackSubscription};
        });
    });

    describe('Android back', () => {
        it('requests a cancel and consumes the press', async () => {
            getPlatformMock.mockReturnValue(CONST.PLATFORM.ANDROID);
            const requestCancel = jest.fn();
            await renderOpenHook(requestCancel);

            expect(hardwareBackHandler?.()).toBe(true);
            expect(requestCancel).toHaveBeenCalledTimes(1);
        });

        it('is not subscribed off Android', async () => {
            await renderOpenHook(jest.fn());

            expect(addBackListenerSpy).not.toHaveBeenCalled();
        });
    });

    describe('browser back', () => {
        it('re-pins the marker and requests a cancel when the marker leaves the history', async () => {
            const requestCancel = jest.fn();
            await renderOpenHook(requestCancel);

            setRootHistory(['SomeScreen']);
            await waitForBatchedUpdates();

            expect(requestCancel).toHaveBeenCalledTimes(1);
            expect(markerToggles()).toEqual([{isVisible: true}]);
        });

        it('ignores a programmatic goBack that strips and re-attaches the marker', async () => {
            const requestCancel = jest.fn();
            await renderOpenHook(requestCancel);
            let reattach: (() => void) | undefined;

            popAndRealignMfaMarker(
                () => setRootHistory(['SomeScreen']),
                (callback) => {
                    reattach = callback;
                },
            );
            reattach?.();
            await waitForBatchedUpdates();

            expect(requestCancel).not.toHaveBeenCalled();
            // The bracket's own strip and re-attach; the hook adds no re-pin of its own.
            expect(markerToggles()).toEqual([{isVisible: false}, {isVisible: true}]);
        });
    });

    describe('closing', () => {
        it('removes the marker and cancels a pending re-attach', async () => {
            const hook = await renderOpenHook(jest.fn());
            let reattach: (() => void) | undefined;
            popAndRealignMfaMarker(
                () => setRootHistory(['SomeScreen']),
                (callback) => {
                    reattach = callback;
                },
            );
            expect(isMfaMarkerStripInProgress()).toBe(true);
            mockDispatch.mockClear();

            hook.rerender({modalState: MFA_STATE.CLOSING});
            await waitForBatchedUpdates();
            reattach?.();
            await waitForBatchedUpdates();

            expect(isMfaMarkerStripInProgress()).toBe(false);
            expect(markerToggles()).toEqual([{isVisible: false}]);
        });

        it('releases the Android back and history subscriptions', async () => {
            getPlatformMock.mockReturnValue(CONST.PLATFORM.ANDROID);
            const requestCancel = jest.fn();
            const hook = await renderOpenHook(requestCancel);

            hook.rerender({modalState: MFA_STATE.CLOSING});
            setRootHistory(['SomeScreen']);

            expect(removeBackSubscription).toHaveBeenCalledTimes(1);
            expect(mockStateListeners.size).toBe(0);
            expect(requestCancel).not.toHaveBeenCalled();
        });
    });
});

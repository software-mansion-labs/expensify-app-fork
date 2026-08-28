import {act, fireEvent, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {CurrentUserPersonalDetailsProvider} from '@components/CurrentUserPersonalDetailsProvider';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {useWideRHPState} from '@components/WideRHPContextProvider';
import type * as WideRHPContextProviderModule from '@components/WideRHPContextProvider';
import {defaultWideRHPStateContextValue} from '@components/WideRHPContextProvider/default';
import {KeyboardStateProvider} from '@components/withKeyboardState';

import useResponsiveLayout from '@hooks/useResponsiveLayout';

import focusComposerWithDelay from '@libs/focusComposerWithDelay';
import TransitionTracker from '@libs/Navigation/TransitionTracker';
import ReportActionComposeFocusManager from '@libs/ReportActionComposeFocusManager';
import updateMultilineInputRange from '@libs/updateMultilineInputRange';

import ReportActionCompose from '@pages/inbox/report/ReportActionCompose/ReportActionCompose';
import useAttachmentPicker from '@pages/inbox/report/ReportActionCompose/useAttachmentPicker';
import {ReportActionEditMessageContextProvider} from '@pages/inbox/report/ReportActionEditMessageContext';

import {saveReportActionDraft} from '@userActions/Report';
import type * as ReportUserActions from '@userActions/Report';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as NativeNavigation from '@react-navigation/native';
import type {PropsWithChildren} from 'react';

import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import * as LHNTestUtils from '../utils/LHNTestUtils';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

jest.mock('@libs/ComponentUtils', () => ({
    forceClearInput: jest.fn(),
}));

jest.mock('@libs/updateMultilineInputRange', () => ({
    __esModule: true,
    default: jest.fn(),
}));

// The delayed-autofocus tests only care that a focus request reaches the composer, not what focusing does.
jest.mock('@libs/focusComposerWithDelay', () => ({
    __esModule: true,
    default: jest.fn(),
}));

// Mocked so a test can hold the "covering transition still running" state open and flush it on demand.
jest.mock('@libs/Navigation/TransitionTracker', () => ({
    __esModule: true,
    default: {startTransition: jest.fn(), endTransition: jest.fn(), runAfterTransitions: jest.fn()},
}));

// Forced on so `shouldAutoFocus` matches the platforms where the delayed autofocus applies.
jest.mock('@libs/canFocusInputOnScreenFocus', () => ({
    __esModule: true,
    default: jest.fn(() => true),
}));

jest.mock('@hooks/useResponsiveLayout', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@components/WideRHPContextProvider', () => ({
    ...jest.requireActual<typeof WideRHPContextProviderModule>('@components/WideRHPContextProvider'),
    useWideRHPState: jest.fn(),
}));

jest.mock('@userActions/Report', () => ({
    ...jest.requireActual<typeof ReportUserActions>('@userActions/Report'),
    saveReportActionDraft: jest.fn(),
}));

jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: jest.fn((key: string) => key),
        numberFormat: jest.fn((num: number) => num.toString()),
    })),
);

jest.mock('@hooks/usePaginatedReportActions', () => jest.fn(() => ({reportActions: [], hasNewerActions: false, hasOlderActions: false})));
jest.mock('@hooks/useParentReportAction', () => jest.fn(() => null));
jest.mock('@hooks/useReportTransactionsCollection', () => jest.fn(() => ({})));
jest.mock('@hooks/useShortMentionsList', () => jest.fn(() => ({availableLoginsList: []})));
jest.mock('@hooks/useSidePanelState', () => jest.fn(() => ({sessionStartTime: null})));

jest.mock('@pages/inbox/report/ReportActionCompose/useAttachmentPicker', () => jest.fn());
jest.mock('@pages/Share/getFileSize', () => jest.fn(() => Promise.resolve(100)));

// The composer ref rendered by the test renderer has no native `setSelection` implementation
jest.mock('@pages/inbox/report/ReportActionCompose/ReportActionComposeUtils', () => ({
    __esModule: true,
    default: {updateNativeSelectionValue: jest.fn()},
}));

jest.mock('@components/DropZone/DualDropZone', () => {
    const RN = jest.requireActual<Record<string, React.ComponentType<{testID?: string; children?: React.ReactNode}>>>('react-native');
    return () => <RN.Text testID="dual-drop-zone" />;
});

const mockRouteState = {current: {key: '', name: '', params: {reportID: '1'}}};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useNavigation: jest.fn(() => ({navigate: jest.fn(), addListener: jest.fn(() => jest.fn())})),
    useIsFocused: jest.fn(() => true),
    useRoute: jest.fn(() => mockRouteState.current),
}));

TestHelper.setupGlobalFetchMock();

const mockedUpdateMultilineInputRange = jest.mocked(updateMultilineInputRange);
const mockedFocusComposerWithDelay = jest.mocked(focusComposerWithDelay);
const mockedRunAfterTransitions = jest.mocked(TransitionTracker.runAfterTransitions);
const mockedUseWideRHPState = jest.mocked(useWideRHPState);
const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);
const mockedSaveReportActionDraft = jest.mocked(saveReportActionDraft);

// The inner function focusComposerWithDelay returns; a call here is the focus request landing on the composer.
const mockRequestComposerFocus = jest.fn(() => Promise.resolve());

const wideLayout: ReturnType<typeof useResponsiveLayout> = {
    shouldUseNarrowLayout: false,
    isSmallScreenWidth: false,
    isInNarrowPaneModal: false,
    isExtraSmallScreenHeight: false,
    isExtraSmallScreenWidth: false,
    isMediumScreenWidth: false,
    onboardingIsMediumOrLargerScreenWidth: true,
    isLargeScreenWidth: true,
    isExtraLargeScreenWidth: false,
    isSmallScreen: false,
    isInLandscapeMode: false,
};

const narrowLayout: ReturnType<typeof useResponsiveLayout> = {
    shouldUseNarrowLayout: true,
    isSmallScreenWidth: true,
    isInNarrowPaneModal: false,
    isExtraSmallScreenHeight: false,
    isExtraSmallScreenWidth: false,
    isMediumScreenWidth: false,
    onboardingIsMediumOrLargerScreenWidth: false,
    isLargeScreenWidth: false,
    isExtraLargeScreenWidth: false,
    isSmallScreen: true,
    isInLandscapeMode: false,
};

// Stand-in for TransitionTracker's pending-callback queue while a covering transition is running.
let pendingTransitionCallbacks: Array<() => void | Promise<void>> = [];

function flushPendingTransitionCallbacks() {
    const callbacks = pendingTransitionCallbacks;
    pendingTransitionCallbacks = [];
    for (const callback of callbacks) {
        callback();
    }
}

const defaultReport = LHNTestUtils.getFakeReport();
const editedAction = {...LHNTestUtils.getFakeReportAction(), actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT};

function ReportActionEditMessageContextProviderForReport({children}: PropsWithChildren) {
    return <ReportActionEditMessageContextProvider reportID={defaultReport.reportID}>{children}</ReportActionEditMessageContextProvider>;
}

function ComposerScreen() {
    return (
        <ComposeProviders
            components={[OnyxListItemProvider, CurrentUserPersonalDetailsProvider, LocaleContextProvider, KeyboardStateProvider, ReportActionEditMessageContextProviderForReport]}
        >
            <ReportActionCompose reportID={defaultReport.reportID} />
        </ComposeProviders>
    );
}

/**
 * The composer publishes itself to a process-wide focus manager and positions the caret in the draft once, at mount.
 * Both are shared with whatever screen covers this one, so a cover must not touch either. The assertions describe
 * behavior that ships today.
 */
describe('ReportActionCompose across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS, evictableKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS]});
    });

    beforeEach(async () => {
        jest.mocked(useAttachmentPicker).mockReturnValue({pickAttachments: jest.fn(), PDFValidationComponent: undefined, ErrorModal: <View />});
        mockRouteState.current = {key: '', name: '', params: {reportID: '1'}};
        mockedFocusComposerWithDelay.mockReturnValue(mockRequestComposerFocus);
        mockedUseWideRHPState.mockReturnValue(defaultWideRHPStateContextValue);
        mockedUseResponsiveLayout.mockReturnValue(wideLayout);
        pendingTransitionCallbacks = [];
        mockedRunAfterTransitions.mockImplementation(({callback}) => {
            pendingTransitionCallbacks.push(callback);
            return {
                cancel: () => {
                    const index = pendingTransitionCallbacks.indexOf(callback);
                    if (index !== -1) {
                        pendingTransitionCallbacks.splice(index, 1);
                    }
                },
            };
        });
        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${defaultReport.reportID}`, defaultReport);
        });
    });

    afterEach(async () => {
        // The setup file switches the suite to real timers, so a test that opted into fake timers restores them here.
        jest.useRealTimers();
        await act(async () => {
            await Onyx.clear();
        });
        jest.clearAllMocks();
    });

    it('leaves the shared composer focus manager alone when the chat is covered', async () => {
        // `clear()` drops the process-wide focus callback, which is what makes a later `focus()` request reach a
        // composer at all. The manager exposes no getter for it, so the call itself is the observable.
        const clearSpy = jest.spyOn(ReportActionComposeFocusManager, 'clear');
        const chatScreen = renderCoverableScreen(<ComposerScreen />);
        await waitForBatchedUpdatesWithAct();
        clearSpy.mockClear();

        await chatScreen.hide();
        await waitForBatchedUpdatesWithAct();

        // The screen covering this one is the thread whose composer registered itself in the same manager, so
        // clearing here drops someone else's callback.
        expect(clearSpy).not.toHaveBeenCalled();

        clearSpy.mockRestore();
    });

    it('does not reposition the caret in the draft when the chat is revealed', async () => {
        const chatScreen = renderCoverableScreen(<ComposerScreen />);
        await waitForBatchedUpdatesWithAct();
        mockedUpdateMultilineInputRange.mockClear();

        await chatScreen.hide();
        await chatScreen.reveal();
        await waitForBatchedUpdatesWithAct();

        // Repositioning scrolls the composer down and puts the selection at the end, losing where the user was typing.
        expect(mockedUpdateMultilineInputRange).not.toHaveBeenCalled();
    });

    it('still lands the delayed autofocus scheduled behind the covering transition', async () => {
        // A SearchReport stacked above a wide RHP skips the TextInput's own autoFocus and instead parks a manual
        // `focus(true)` in TransitionTracker until the push transition finishes. Covering the screen mid-transition
        // must not eat that focus request: `delayedAutoFocusRouteKeyRef` survives with the same `route.key`, so
        // nothing ever re-arms it.
        mockRouteState.current = {key: 'search-report-route', name: SCREENS.RIGHT_MODAL.SEARCH_REPORT, params: {reportID: defaultReport.reportID}};
        mockedUseWideRHPState.mockReturnValue({...defaultWideRHPStateContextValue, superWideRHPRouteKeys: ['covering-rhp-route']});

        const chatScreen = renderCoverableScreen(<ComposerScreen />);
        await waitForBatchedUpdatesWithAct();

        // The focus request is parked behind the still-running transition, not delivered yet.
        expect(mockRequestComposerFocus).not.toHaveBeenCalled();

        await chatScreen.hide();
        await chatScreen.reveal();

        // The covering transition ends after the cover/reveal cycle; the parked autofocus must still be delivered.
        await act(async () => flushPendingTransitionCallbacks());
        expect(mockRequestComposerFocus).toHaveBeenCalledWith(true, undefined, false);
    });

    it('persists a keystroke typed into a message edit just before the chat is covered', async () => {
        // Editing a message in the main composer (narrow layout) saves through a debounced `saveReportActionDraft`
        // whose debounce window keeps running while the chat is covered, so a keystroke typed right before opening
        // a thread still reaches the draft store.
        jest.useFakeTimers();
        mockedUseResponsiveLayout.mockReturnValue(narrowLayout);
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${defaultReport.reportID}`, {[editedAction.reportActionID]: editedAction});
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${defaultReport.reportID}`, {[editedAction.reportActionID]: {message: 'Original body'}});
        });

        const chatScreen = renderCoverableScreen(<ComposerScreen />);
        await waitForBatchedUpdatesWithAct();

        const composer = screen.getByTestId(CONST.COMPOSER.NATIVE_ID);
        expect(composer.props.value).toBe('Original body');

        // The keystroke lands inside the debounce window; the chat is covered before the save timer fires.
        fireEvent.changeText(composer, 'Original body, edited');
        expect(screen.getByTestId(CONST.COMPOSER.NATIVE_ID).props.value).toBe('Original body, edited');
        await chatScreen.hide();
        await chatScreen.reveal();
        await act(async () => {
            jest.advanceTimersByTime(CONST.TIMING.DRAFT_SAVE_DEBOUNCE_TIME + 1);
        });

        expect(mockedSaveReportActionDraft).toHaveBeenCalledWith(
            defaultReport.reportID,
            expect.objectContaining({reportActionID: editedAction.reportActionID}),
            expect.anything(),
            'Original body, edited',
        );
    });
});

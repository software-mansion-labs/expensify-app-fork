import {act} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {CurrentUserPersonalDetailsProvider} from '@components/CurrentUserPersonalDetailsProvider';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {KeyboardStateProvider} from '@components/withKeyboardState';

import ReportActionComposeFocusManager from '@libs/ReportActionComposeFocusManager';
import updateMultilineInputRange from '@libs/updateMultilineInputRange';

import ReportActionCompose from '@pages/inbox/report/ReportActionCompose/ReportActionCompose';
import useAttachmentPicker from '@pages/inbox/report/ReportActionCompose/useAttachmentPicker';
import {ReportActionEditMessageContextProvider} from '@pages/inbox/report/ReportActionEditMessageContext';

import ONYXKEYS from '@src/ONYXKEYS';

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

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useNavigation: jest.fn(() => ({navigate: jest.fn(), addListener: jest.fn(() => jest.fn())})),
    useIsFocused: jest.fn(() => true),
    useRoute: jest.fn(() => ({key: '', name: '', params: {reportID: '1'}})),
}));

TestHelper.setupGlobalFetchMock();

const mockedUpdateMultilineInputRange = jest.mocked(updateMultilineInputRange);
const defaultReport = LHNTestUtils.getFakeReport();

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
        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${defaultReport.reportID}`, defaultReport);
        });
    });

    afterEach(async () => {
        await act(async () => {
            await Onyx.clear();
        });
        jest.clearAllMocks();
    });

    it('leaves the shared composer focus manager alone when the chat is covered', async () => {
        // `clear()` drops the process-wide focus callback, which is what makes a later `focus()` request reach a
        // composer at all. The manager exposes no getter for it, so the call itself is the observable.
        const clearSpy = jest.spyOn(ReportActionComposeFocusManager, 'clear');
        const screen = renderCoverableScreen(<ComposerScreen />);
        await waitForBatchedUpdatesWithAct();
        clearSpy.mockClear();

        await screen.hide();
        await waitForBatchedUpdatesWithAct();

        // The screen covering this one is the thread whose composer registered itself in the same manager, so
        // clearing here drops someone else's callback.
        expect(clearSpy).not.toHaveBeenCalled();

        clearSpy.mockRestore();
    });

    it('does not reposition the caret in the draft when the chat is revealed', async () => {
        const screen = renderCoverableScreen(<ComposerScreen />);
        await waitForBatchedUpdatesWithAct();
        mockedUpdateMultilineInputRange.mockClear();

        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        // Repositioning scrolls the composer down and puts the selection at the end, losing where the user was typing.
        expect(mockedUpdateMultilineInputRange).not.toHaveBeenCalled();
    });
});

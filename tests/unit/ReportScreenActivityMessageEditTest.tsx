import {act} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {CurrentUserPersonalDetailsProvider} from '@components/CurrentUserPersonalDetailsProvider';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {KeyboardStateProvider} from '@components/withKeyboardState';

import focusComposerWithDelay from '@libs/focusComposerWithDelay';

import {ReportActionEditMessageContextProvider} from '@pages/inbox/report/ReportActionEditMessageContext';
import ReportActionItemMessageEdit from '@pages/inbox/report/ReportActionItemMessageEdit';
import {draftMessageVideoAttributeCache} from '@pages/inbox/report/useDraftMessageVideoAttributeCache';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';
import type {PropsWithChildren} from 'react';

import React from 'react';
import Onyx from 'react-native-onyx';

import * as LHNTestUtils from '../utils/LHNTestUtils';
import renderCoverableScreen from '../utils/ScreenCoverHarness';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

// The focus test only cares that a focus request reaches the edit composer, not what focusing does.
jest.mock('@libs/focusComposerWithDelay', () => ({
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

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useNavigation: jest.fn(() => ({navigate: jest.fn(), addListener: jest.fn(() => jest.fn())})),
    useIsFocused: jest.fn(() => true),
    useRoute: jest.fn(() => ({key: '', name: '', params: {reportID: '1'}})),
}));

TestHelper.setupGlobalFetchMock();

const mockedFocusComposerWithDelay = jest.mocked(focusComposerWithDelay);

// The inner function focusComposerWithDelay returns; a call here is the focus request landing on the composer.
const mockRequestComposerFocus = jest.fn(() => Promise.resolve());

const defaultReport = LHNTestUtils.getFakeReport();
const editedAction = {...LHNTestUtils.getFakeReportAction(), actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT};

function ReportActionEditMessageContextProviderForReport({children}: PropsWithChildren) {
    return <ReportActionEditMessageContextProvider reportID={defaultReport.reportID}>{children}</ReportActionEditMessageContextProvider>;
}

function MessageEditScreen() {
    return (
        <ComposeProviders
            components={[OnyxListItemProvider, CurrentUserPersonalDetailsProvider, LocaleContextProvider, KeyboardStateProvider, ReportActionEditMessageContextProviderForReport]}
        >
            <ReportActionItemMessageEdit
                action={editedAction}
                reportID={defaultReport.reportID}
                originalReportID={defaultReport.reportID}
            />
        </ComposeProviders>
    );
}

/**
 * The inline message editor focuses its composer once, at mount, which is what pops the keyboard when an edit
 * starts. That focus must stay a per-screen-lifetime event; it must not replay every time the covered chat is
 * revealed underneath a thread. The assertions describe behavior that ships today.
 */
describe('ReportActionItemMessageEdit across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS, evictableKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS]});
    });

    beforeEach(async () => {
        mockedFocusComposerWithDelay.mockReturnValue(mockRequestComposerFocus);
        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${defaultReport.reportID}`, defaultReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${defaultReport.reportID}`, {[editedAction.reportActionID]: editedAction});
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${defaultReport.reportID}`, {[editedAction.reportActionID]: {message: 'Original body'}});
        });
    });

    afterEach(async () => {
        await act(async () => {
            await Onyx.clear();
        });
        draftMessageVideoAttributeCache.clear();
        jest.clearAllMocks();
    });

    it('requests focus for the edit composer once per screen lifetime, not again on a reveal', async () => {
        const screen = renderCoverableScreen(<MessageEditScreen />);
        await waitForBatchedUpdatesWithAct();

        // Starting the edit focuses the composer once, at mount.
        expect(mockRequestComposerFocus).toHaveBeenCalledTimes(1);

        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        // Coming back from the covering thread must not re-focus the editor and pop the keyboard again.
        expect(mockRequestComposerFocus).toHaveBeenCalledTimes(1);
    });
});

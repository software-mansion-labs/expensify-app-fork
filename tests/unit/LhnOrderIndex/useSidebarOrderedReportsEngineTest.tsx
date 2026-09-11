import {renderHook} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import {CurrentReportIDContextProvider} from '@hooks/useCurrentReportID';
import {SidebarOrderedReportsContextProvider, useSidebarOrderedReports} from '@hooks/useSidebarOrderedReports';

import {getJsLhnOrderSnapshot, resetJsLhnOrderStore} from '@libs/LhnOrderIndex/JsLhnOrderStore';
import {getLhnOrderSnapshot, resetLhnOrderIndexStore} from '@libs/LhnOrderIndex/LhnOrderIndexStore';
import {setLhnEngineMode} from '@libs/SqlEngine/lhnEngineMode';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import Onyx from 'react-native-onyx';

import buildLhnDataset from '../../utils/collections/lhnDataset';
import {resetMockEngine, setMockEngineAvailable} from '../../utils/mockSqlEngineClient';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import
jest.mock('@libs/SqlEngine/EngineClient', () => require('../../utils/mockSqlEngineClient'));

const CURRENT_USER_ACCOUNT_ID = 1;
const CURRENT_USER_EMAIL = 'me@example.com';
const REPORT_COUNT = 60;

function TestWrapper({children}: {children: React.ReactNode}) {
    return (
        <OnyxListItemProvider>
            <CurrentReportIDContextProvider>
                <SidebarOrderedReportsContextProvider currentReportIDForTests="1">{children}</SidebarOrderedReportsContextProvider>
            </CurrentReportIDContextProvider>
        </OnyxListItemProvider>
    );
}

async function renderSidebar() {
    const {result} = renderHook(() => useSidebarOrderedReports(), {wrapper: TestWrapper});
    await waitForBatchedUpdatesWithAct();
    await waitForBatchedUpdatesWithAct();
    return result;
}

describe('the sidebar provider in the two LHN index modes', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        resetMockEngine();
        resetLhnOrderIndexStore();
        resetJsLhnOrderStore();
        setMockEngineAvailable(true);
        const dataset = buildLhnDataset({reportCount: REPORT_COUNT, currentUserAccountID: CURRENT_USER_ACCOUNT_ID});
        await Onyx.clear();
        await Onyx.merge(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: CURRENT_USER_EMAIL});
        await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT, dataset.reports);
        await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, dataset.reportNameValuePairs);
        await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT, dataset.draftComments);
        await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {reports: dataset.reportAttributes, locale: null});
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => Onyx.clear());

    it('shows the same reports in the same order as the JS sort, and the same tab counts', async () => {
        setLhnEngineMode('off');
        const today = await renderSidebar();
        const expectedOrder = today.current.orderedReportIDs;
        const expectedCounts = today.current.inboxTabCounts;

        resetLhnOrderIndexStore();
        setLhnEngineMode('sql');
        const withEngine = await renderSidebar();

        // Without this the fallback to the JS sort would make the assertions below pass without an engine order at all.
        expect(getLhnOrderSnapshot()?.reportIDs).toEqual(expectedOrder);
        expect(expectedOrder.length).toBeGreaterThan(0);
        expect(withEngine.current.orderedReportIDs).toEqual(expectedOrder);
        expect(withEngine.current.inboxTabCounts).toEqual(expectedCounts);
        expect(withEngine.current.filteredReports.map((report) => report.reportID)).toEqual(today.current.filteredReports.map((report) => report.reportID));
    });

    it('shows the same reports, tabs and counts with the order kept in JS, without an engine at all', async () => {
        setLhnEngineMode('off');
        const today = await renderSidebar();
        const expectedOrder = today.current.orderedReportIDs;
        const expectedCounts = today.current.inboxTabCounts;

        resetJsLhnOrderStore();
        setLhnEngineMode('js');
        setMockEngineAvailable(false);
        const withJsIndex = await renderSidebar();

        expect(getJsLhnOrderSnapshot()?.reportIDs).toEqual(expectedOrder);
        expect(expectedOrder.length).toBeGreaterThan(0);
        expect(withJsIndex.current.orderedReportIDs).toEqual(expectedOrder);
        expect(withJsIndex.current.inboxTabCounts).toEqual(expectedCounts);
        expect(withJsIndex.current.filteredReports.map((report) => report.reportID)).toEqual(today.current.filteredReports.map((report) => report.reportID));
    });

    it('keeps the JS order when the engine is unavailable', async () => {
        setLhnEngineMode('off');
        const today = await renderSidebar();
        const expectedOrder = today.current.orderedReportIDs;

        resetLhnOrderIndexStore();
        setLhnEngineMode('sql');
        setMockEngineAvailable(false);
        const withoutEngine = await renderSidebar();

        expect(withoutEngine.current.orderedReportIDs).toEqual(expectedOrder);
        expect(getLhnOrderSnapshot()).toBeUndefined();
    });
});

import {act, renderHook} from '@testing-library/react-native';

import {CurrentUserPersonalDetailsContext} from '@components/CurrentUserPersonalDetailsProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import {CurrentReportIDContextProvider} from '@hooks/useCurrentReportID';
import {SidebarOrderedReportsContextProvider, useSidebarOrderedReports} from '@hooks/useSidebarOrderedReports';

import SidebarUtils from '@libs/SidebarUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAttributesDerivedValue} from '@src/types/onyx';
import type {CurrentUserPersonalDetails} from '@src/types/onyx/PersonalDetails';

import type {OnyxMultiSetInput} from 'react-native-onyx';

import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

// Mock dependencies
jest.mock('@libs/SidebarUtils', () => ({
    sortReportsToDisplayInLHN: jest.fn(),
    getReportsToDisplayInLHN: jest.fn(),
    updateReportsToDisplayInLHN: jest.fn(),
    filterReportsForInboxTab: jest.fn((reportIDs: string[]) => reportIDs),
    getInboxTabSummary: jest.fn(() => ({counts: {}, hasStaleUnreadReport: false})),
}));
jest.mock('@libs/Navigation/Navigation', () => ({
    getActiveRouteWithoutParams: jest.fn(() => ''),
    isNavigationReady: jest.fn(() => Promise.resolve()),
    getTopmostReportId: jest.fn(),
}));
jest.mock('@libs/ReportUtils', () => ({
    parseReportRouteParams: jest.fn(() => ({reportID: undefined})),
    getReportIDFromLink: jest.fn(() => ''),
}));

const mockSidebarUtils = jest.mocked(SidebarUtils);

describe('useSidebarOrderedReports', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        // Set up basic session data
        await act(async () => {
            await Onyx.set(ONYXKEYS.SESSION, {
                accountID: 12345,
                email: 'test@example.com',
                authTokenType: CONST.AUTH_TOKEN_TYPES.ANONYMOUS,
            });
        });
        return waitForBatchedUpdatesWithAct();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await act(async () => {
            await Onyx.clear();

            // Set up basic session data for each test
            await Onyx.set(ONYXKEYS.SESSION, {
                accountID: 12345,
                email: 'test@example.com',
                authTokenType: CONST.AUTH_TOKEN_TYPES.ANONYMOUS,
            });

            // Set up required Onyx data that the hook depends on
            await Onyx.multiSet({
                [ONYXKEYS.NVP_PRIORITY_MODE]: CONST.PRIORITY_MODE.DEFAULT,
                [ONYXKEYS.COLLECTION.REPORT]: {},
                [ONYXKEYS.COLLECTION.POLICY]: {},
                [ONYXKEYS.COLLECTION.TRANSACTION]: {},
                [ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS]: {},
                [ONYXKEYS.BETAS]: [],
                [ONYXKEYS.DERIVED.REPORT_ATTRIBUTES]: {reports: {}},
                [ONYXKEYS.DERIVED.GUIDE_ACCOUNT_IDS]: [],
            } satisfies OnyxMultiSetInput);
        });

        await waitForBatchedUpdatesWithAct();

        // Default mock implementations
        mockSidebarUtils.getReportsToDisplayInLHN.mockImplementation(() => ({}));
        mockSidebarUtils.updateReportsToDisplayInLHN.mockImplementation(({displayedReports}) => displayedReports);
        mockSidebarUtils.sortReportsToDisplayInLHN.mockReturnValue([]);

        await waitForBatchedUpdatesWithAct();
    });

    afterAll(async () => {
        await act(async () => {
            await Onyx.clear();
        });
        await waitForBatchedUpdatesWithAct();
    });

    const createMockReports = (reports: Record<string, Partial<Report>>) => {
        const mockReports: Record<string, Report> = {};
        for (const [key, report] of Object.entries(reports)) {
            const reportId = key.replace('report', '');
            mockReports[reportId] = {
                reportID: reportId,
                reportName: `Report ${reportId}`,
                lastVisibleActionCreated: '2024-01-01 10:00:00',
                type: CONST.REPORT.TYPE.CHAT,
                ...report,
            } as Report;
        }
        return mockReports;
    };

    let currentReportIDForTestsValue: string | undefined;

    function TestWrapper({children}: {children: React.ReactNode}) {
        return (
            <OnyxListItemProvider>
                <CurrentReportIDContextProvider>
                    <SidebarOrderedReportsContextProvider currentReportIDForTests={currentReportIDForTestsValue}>{children}</SidebarOrderedReportsContextProvider>
                </CurrentReportIDContextProvider>
            </OnyxListItemProvider>
        );
    }

    it('should prevent unnecessary re-renders when reports have same content but different references', async () => {
        // Given reports with same content but different object references
        const reportsContent = {
            report1: {
                reportName: 'Chat 1',
                lastVisibleActionCreated: '2024-01-01 10:00:00',
            },
            report2: {
                reportName: 'Chat 2',
                lastVisibleActionCreated: '2024-01-01 11:00:00',
            },
        };

        // When the initial reports are set
        const initialReports = createMockReports(reportsContent);
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(initialReports);
        mockSidebarUtils.updateReportsToDisplayInLHN.mockImplementation(({displayedReports}) => displayedReports);
        currentReportIDForTestsValue = '1';

        // When the hook is rendered
        const {rerender} = renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });

        await waitForBatchedUpdatesWithAct();

        const fullScanCall = mockSidebarUtils.getReportsToDisplayInLHN.mock.calls.at(0);
        if (!fullScanCall) {
            throw new Error('SidebarUtils.getReportsToDisplayInLHN was not called');
        }
        const [{transactionViolations, draftComments}] = fullScanCall;
        expect(Object.keys(transactionViolations ?? {})).toHaveLength(0);
        expect(Object.keys(draftComments ?? {})).toHaveLength(0);

        // Then the mock calls are cleared
        mockSidebarUtils.sortReportsToDisplayInLHN.mockClear();

        // When the reports are updated
        const newReportsWithSameContent = createMockReports(reportsContent);
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(newReportsWithSameContent);

        rerender({});

        await waitForBatchedUpdatesWithAct();

        // Then sortReportsToDisplayInLHN should not be called again since deep comparison shows no change
        expect(mockSidebarUtils.sortReportsToDisplayInLHN).not.toHaveBeenCalled();
    });

    it('should trigger re-render when reports content actually changes', async () => {
        // Given the initial reports are set
        const initialReports = createMockReports({
            report1: {reportName: 'Chat 1'},
            report2: {reportName: 'Chat 2'},
        });

        // When the reports are updated
        const updatedReports = createMockReports({
            report1: {reportName: 'Chat 1 Updated'}, // Content changed
            report2: {reportName: 'Chat 2'},
            report3: {reportName: 'Chat 3'}, // New report added
        });

        // Then the initial reports are set
        await act(async () => {
            await Onyx.multiSet({
                [`${ONYXKEYS.COLLECTION.REPORT}1` as const]: initialReports['1'],
                [`${ONYXKEYS.COLLECTION.REPORT}2` as const]: initialReports['2'],
            } satisfies OnyxMultiSetInput);
        });

        await waitForBatchedUpdatesWithAct();

        // When the mock is updated
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(initialReports);

        // When the hook is rendered
        const {rerender} = renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });

        await waitForBatchedUpdatesWithAct();

        // Then the mock calls are cleared
        mockSidebarUtils.sortReportsToDisplayInLHN.mockClear();

        // When the mocks are updated to reflect the new content
        // getReportsToDisplayInLHN covers the full-scan path; updateReportsToDisplayInLHN covers
        // the incremental path (taken when priority mode changes and the cache is already populated).
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(updatedReports);
        mockSidebarUtils.updateReportsToDisplayInLHN.mockReturnValue(updatedReports);

        // When the priority mode is changed
        await act(async () => {
            await Onyx.set(ONYXKEYS.NVP_PRIORITY_MODE, CONST.PRIORITY_MODE.GSD);
        });

        rerender({});

        await waitForBatchedUpdatesWithAct();

        // Then sortReportsToDisplayInLHN should be called with the updated reports
        expect(mockSidebarUtils.sortReportsToDisplayInLHN).toHaveBeenCalledWith(
            updatedReports,
            expect.any(String), // priorityMode
            expect.any(Function), // localeCompare
            expect.any(Object), // reportsDrafts
            expect.any(Object), // reportNameValuePairs
            expect.anything(), // reportAttributes
        );
    });

    it('should handle empty reports correctly with deep comparison', async () => {
        // Given the initial reports are set
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue({});

        // When the hook is rendered
        const {rerender} = renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });

        await waitForBatchedUpdatesWithAct();

        // Then the mock calls are cleared
        mockSidebarUtils.sortReportsToDisplayInLHN.mockClear();

        // When the mock is updated
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue({});

        rerender({});

        await waitForBatchedUpdatesWithAct();

        // Then sortReportsToDisplayInLHN should not be called again since reports are empty
        expect(mockSidebarUtils.sortReportsToDisplayInLHN).not.toHaveBeenCalled();
    });

    it('should maintain referential stability across multiple renders with same content', async () => {
        // Given the initial reports are set
        const reportsContent = {
            report1: {reportName: 'Stable Chat'},
        };

        // When the initial reports are set
        const initialReports = createMockReports(reportsContent);
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(initialReports);
        mockSidebarUtils.sortReportsToDisplayInLHN.mockReturnValue(['1']);
        currentReportIDForTestsValue = '1';

        const {rerender} = renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });

        await waitForBatchedUpdatesWithAct();

        // When the mock is updated
        const newReportsWithSameContent = createMockReports(reportsContent);
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(newReportsWithSameContent);

        rerender({});
        await waitForBatchedUpdatesWithAct();
        currentReportIDForTestsValue = '2';

        // When the mock is updated
        const thirdReportsWithSameContent = createMockReports(reportsContent);
        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(thirdReportsWithSameContent);

        rerender({});
        await waitForBatchedUpdatesWithAct();
        currentReportIDForTestsValue = '3';

        // Then sortReportsToDisplayInLHN should be called only once (initial render)
        expect(mockSidebarUtils.sortReportsToDisplayInLHN).toHaveBeenCalledTimes(1);
    });

    it('should handle priority mode changes correctly with deep comparison', async () => {
        // Given the initial reports are set
        const reports = createMockReports({
            report1: {reportName: 'Chat A'},
            report2: {reportName: 'Chat B'},
        });

        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(reports);
        currentReportIDForTestsValue = '1';

        // When the hook is rendered
        const {rerender} = renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });

        await waitForBatchedUpdatesWithAct();

        // Then the mock calls are cleared
        mockSidebarUtils.sortReportsToDisplayInLHN.mockClear();
        currentReportIDForTestsValue = '2';

        // When the priority mode is changed
        await act(async () => {
            await Onyx.set(ONYXKEYS.NVP_PRIORITY_MODE, CONST.PRIORITY_MODE.GSD);
        });

        await waitForBatchedUpdatesWithAct();

        rerender({});

        await waitForBatchedUpdatesWithAct();

        // Then sortReportsToDisplayInLHN should be called when priority mode changes
        expect(mockSidebarUtils.sortReportsToDisplayInLHN).toHaveBeenCalled();
    });

    it('should recompute all reports when guide accountIDs hydrate and guide emails become available', async () => {
        const guideAccountID = '8';
        const displayedReports = createMockReports({
            report1: {reportName: 'Chat A'},
        });
        const domainRoomReport = {
            reportID: '2',
            reportName: 'Domain Room',
            lastVisibleActionCreated: '2024-01-01 10:00:00',
            type: CONST.REPORT.TYPE.CHAT,
            chatType: CONST.REPORT.CHAT_TYPE.DOMAIN_ALL,
            participants: {
                [guideAccountID]: {
                    notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                },
            },
        } as Report;

        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(displayedReports);
        mockSidebarUtils.updateReportsToDisplayInLHN.mockImplementation(({displayedReports: reports}) => reports);

        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}1`, displayedReports['1']);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}2`, domainRoomReport);
            await Onyx.set(ONYXKEYS.DERIVED.GUIDE_ACCOUNT_IDS, []);
        });

        renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });

        await waitForBatchedUpdatesWithAct();

        mockSidebarUtils.updateReportsToDisplayInLHN.mockClear();

        // The guide's personal details arriving is what turns the derived value from empty into a populated list.
        // Deriving that list from the personal details is covered by tests/unit/OnyxDerived/guideAccountIDsTest.ts.
        await act(async () => {
            await Onyx.set(ONYXKEYS.DERIVED.GUIDE_ACCOUNT_IDS, [Number(guideAccountID)]);
        });

        await waitForBatchedUpdatesWithAct();

        expect(mockSidebarUtils.updateReportsToDisplayInLHN).toHaveBeenCalledWith(
            expect.objectContaining({
                updatedReportsKeys: expect.arrayContaining([`${ONYXKEYS.COLLECTION.REPORT}1`, `${ONYXKEYS.COLLECTION.REPORT}2`]),
            }),
        );
    });

    it('should not recompute all reports when the guide accountIDs are recomputed to the same set', async () => {
        const participantAccountID = '8';
        const displayedReports = createMockReports({
            report1: {reportName: 'Chat A'},
        });

        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(displayedReports);
        mockSidebarUtils.updateReportsToDisplayInLHN.mockImplementation(({displayedReports: reports}) => reports);

        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}1`, {
                ...displayedReports['1'],
                participants: {
                    [participantAccountID]: {
                        notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS,
                    },
                },
            });
            await Onyx.set(ONYXKEYS.DERIVED.GUIDE_ACCOUNT_IDS, [Number(participantAccountID)]);
        });

        renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });

        await waitForBatchedUpdatesWithAct();

        mockSidebarUtils.updateReportsToDisplayInLHN.mockClear();

        // An unrelated personal-details change (a new avatar, a display name edit) recomputes the derived value to a
        // fresh but shallow-equal array. That must not look like guide hydration and force a full LHN re-scan.
        await act(async () => {
            await Onyx.set(ONYXKEYS.DERIVED.GUIDE_ACCOUNT_IDS, [Number(participantAccountID)]);
        });

        await waitForBatchedUpdatesWithAct();

        const updateCalls = mockSidebarUtils.updateReportsToDisplayInLHN.mock.calls;
        const fullRecomputeCall = updateCalls.find((call) => {
            const updatedReportsKeys = call[0]?.updatedReportsKeys ?? [];
            return updatedReportsKeys.length > 1;
        });

        expect(fullRecomputeCall).toBeUndefined();
    });

    it('should recheck a hidden report when only its derived attributes change', async () => {
        // Given a displayed chat and a chat thread that is hidden from the LHN because its derived attributes still mark it as empty
        const displayedReports = createMockReports({
            report1: {reportName: 'Chat A'},
        });
        const threadReport = {
            reportID: '2',
            reportName: 'Thread',
            lastVisibleActionCreated: '2024-01-01 10:00:00',
            type: CONST.REPORT.TYPE.CHAT,
            parentReportID: '1',
            parentReportActionID: '100',
        } as Report;
        const createThreadAttributes = (isEmpty: boolean): ReportAttributesDerivedValue['reports'][string] => ({
            reportName: 'Thread',
            isEmpty,
            brickRoadStatus: undefined,
            requiresAttention: false,
            reportErrors: {},
        });

        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(displayedReports);
        mockSidebarUtils.updateReportsToDisplayInLHN.mockImplementation(({displayedReports: reports}) => reports);

        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}1`, displayedReports['1']);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}2`, threadReport);
            await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {reports: {[threadReport.reportID]: createThreadAttributes(true)}, locale: null});
        });

        renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });

        await waitForBatchedUpdatesWithAct();

        mockSidebarUtils.updateReportsToDisplayInLHN.mockClear();

        // When the derived attributes land a render after the report change that caused them (e.g. a first reply in the thread),
        // so the reports collection itself does not change in this render
        await act(async () => {
            await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {reports: {[threadReport.reportID]: createThreadAttributes(false)}, locale: null});
        });

        await waitForBatchedUpdatesWithAct();

        // Then the hidden thread is rechecked with the fresh attributes, instead of only the already-displayed reports
        expect(mockSidebarUtils.updateReportsToDisplayInLHN).toHaveBeenCalledWith(
            expect.objectContaining({
                updatedReportsKeys: expect.arrayContaining([`${ONYXKEYS.COLLECTION.REPORT}2`]),
            }),
        );
    });

    it('should only recheck reports whose derived attributes actually changed', async () => {
        // Given two reports whose derived attributes are stored in Onyx, with report 1 remaining unchanged
        const displayedReports = createMockReports({
            report1: {reportName: 'Chat A'},
        });
        const report2 = createMockReports({
            report2: {reportName: 'Chat B'},
        })['2'];
        const unchangedAttributes: ReportAttributesDerivedValue['reports'][string] = {
            reportName: 'Chat A',
            isEmpty: false,
            brickRoadStatus: undefined,
            requiresAttention: false,
            reportErrors: {},
        };
        const createReport2Attributes = (isEmpty: boolean): ReportAttributesDerivedValue['reports'][string] => ({
            reportName: 'Chat B',
            isEmpty,
            brickRoadStatus: undefined,
            requiresAttention: false,
            reportErrors: {},
        });

        mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(displayedReports);
        mockSidebarUtils.updateReportsToDisplayInLHN.mockImplementation(({displayedReports: reports}) => reports);

        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}1`, displayedReports['1']);
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}2`, report2);
            await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {
                reports: {
                    [displayedReports['1'].reportID]: unchangedAttributes,
                    [report2.reportID]: createReport2Attributes(true),
                },
                locale: null,
            });
        });

        renderHook(() => useSidebarOrderedReports(), {
            wrapper: TestWrapper,
        });
        await waitForBatchedUpdatesWithAct();
        mockSidebarUtils.updateReportsToDisplayInLHN.mockClear();

        // When only report 2's derived attributes change, while report 1 keeps the same input object reference
        await act(async () => {
            await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {
                reports: {
                    [displayedReports['1'].reportID]: unchangedAttributes,
                    [report2.reportID]: createReport2Attributes(false),
                },
                locale: null,
            });
        });
        await waitForBatchedUpdatesWithAct();

        // Then the incremental LHN update should recheck report 2 only
        const callForReport2 = mockSidebarUtils.updateReportsToDisplayInLHN.mock.calls.find((call) => call[0]?.updatedReportsKeys.includes(`${ONYXKEYS.COLLECTION.REPORT}2`));
        expect(callForReport2?.[0]?.updatedReportsKeys).toEqual([`${ONYXKEYS.COLLECTION.REPORT}2`]);
    });

    describe('incremental updates', () => {
        const reportKey = (reportID: string) => `${ONYXKEYS.COLLECTION.REPORT}${reportID}` as const;
        const createReport = (reportID: string, report: Partial<Report> = {}): Report => ({
            reportID,
            reportName: `Report ${reportID}`,
            lastVisibleActionCreated: '2024-01-01 10:00:00',
            type: CONST.REPORT.TYPE.CHAT,
            ...report,
        });

        async function renderWithDisplayedReports(reports: Report[], wrapper = TestWrapper) {
            const collection: Record<ReturnType<typeof reportKey>, Report> = {};
            for (const report of reports) {
                collection[reportKey(report.reportID)] = report;
            }
            await act(async () => {
                await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT, collection);
            });
            mockSidebarUtils.getReportsToDisplayInLHN.mockReturnValue(collection);
            // A real update returns a new set whenever a rechecked entry changes, which makes the provider render again.
            mockSidebarUtils.updateReportsToDisplayInLHN.mockImplementation(({displayedReports}) => ({...displayedReports}));

            const result = renderHook(() => useSidebarOrderedReports(), {wrapper});
            await waitForBatchedUpdatesWithAct();
            mockSidebarUtils.updateReportsToDisplayInLHN.mockClear();
            return result;
        }

        it('should recheck only the written report after a write, not every displayed report', async () => {
            // Given two displayed chats
            await renderWithDisplayedReports([createReport('1'), createReport('2')]);

            // When a new message arrives in chat 1
            await act(async () => {
                await Onyx.merge(reportKey('1'), {lastMessageText: 'Hello', lastVisibleActionCreated: '2024-01-02 10:00:00'});
            });
            await waitForBatchedUpdatesWithAct();

            // Then only chat 1 is rechecked, also on the render that the provider's own state update causes
            expect(mockSidebarUtils.updateReportsToDisplayInLHN).toHaveBeenCalledTimes(1);
            expect(mockSidebarUtils.updateReportsToDisplayInLHN).toHaveBeenCalledWith(expect.objectContaining({updatedReportsKeys: [reportKey('1')]}));
        });

        it('should recheck the displayed threads and money requests of a written report', async () => {
            // Given a displayed chat with a thread and an expense report in it, and an unrelated chat
            await renderWithDisplayedReports([createReport('1'), createReport('2', {parentReportID: '1'}), createReport('3', {chatReportID: '1'}), createReport('4')]);

            // When the chat is written, which can change whether its thread and its expense report belong in the LHN
            await act(async () => {
                await Onyx.merge(reportKey('1'), {lastMessageText: 'Hello'});
            });
            await waitForBatchedUpdatesWithAct();

            // Then the thread and the expense report are rechecked with it, and the unrelated chat is not
            const [[{updatedReportsKeys}]] = mockSidebarUtils.updateReportsToDisplayInLHN.mock.calls;
            expect([...updatedReportsKeys].sort()).toEqual([reportKey('1'), reportKey('2'), reportKey('3')]);
        });

        it('should recheck the parent and the chat of a written report', async () => {
            // Given a displayed expense report, its parent chat and its workspace chat
            await renderWithDisplayedReports([createReport('1'), createReport('2'), createReport('3', {parentReportID: '1', chatReportID: '2'})]);

            // When the expense report is written, which the LHN state of its parent can depend on
            await act(async () => {
                await Onyx.merge(reportKey('3'), {lastMessageText: 'Hello'});
            });
            await waitForBatchedUpdatesWithAct();

            // Then the parent and the chat are rechecked with it
            const [[{updatedReportsKeys}]] = mockSidebarUtils.updateReportsToDisplayInLHN.mock.calls;
            expect([...updatedReportsKeys].sort()).toEqual([reportKey('1'), reportKey('2'), reportKey('3')]);
        });

        it('should recheck a chat and its displayed threads when only its report actions change', async () => {
            // Given a displayed chat with a thread on one of its messages, and an unrelated chat
            const parentReportActionID = '100';
            await renderWithDisplayedReports([createReport('1'), createReport('2', {parentReportID: '1', parentReportActionID}), createReport('3')]);

            // When the thread's parent message is deleted, which writes the chat's actions but not the chat or the thread
            await act(async () => {
                await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`, {
                    [parentReportActionID]: {
                        reportActionID: parentReportActionID,
                        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
                        created: '2024-01-01 10:00:00.000',
                        message: [{type: 'COMMENT', html: '', text: '', isDeletedParentAction: true}],
                    },
                });
            });
            await waitForBatchedUpdatesWithAct();

            // Then the chat and the thread are rechecked, because the LHN rules read the thread's parent message
            const [[{updatedReportsKeys}]] = mockSidebarUtils.updateReportsToDisplayInLHN.mock.calls;
            expect([...updatedReportsKeys].sort()).toEqual([reportKey('1'), reportKey('2')]);
        });

        it('should recheck every report when the current user changes', async () => {
            // Given a displayed chat and a hidden one, rendered for a signed-in user
            let currentUserPersonalDetails: CurrentUserPersonalDetails = {accountID: 12345, login: 'test@example.com'};
            function WrapperWithCurrentUser({children}: {children: React.ReactNode}) {
                return (
                    <CurrentUserPersonalDetailsContext.Provider value={currentUserPersonalDetails}>
                        <TestWrapper>{children}</TestWrapper>
                    </CurrentUserPersonalDetailsContext.Provider>
                );
            }
            const hiddenReport = createReport('2');
            await act(async () => {
                await Onyx.set(reportKey(hiddenReport.reportID), hiddenReport);
            });
            const {rerender} = await renderWithDisplayedReports([createReport('1')], WrapperWithCurrentUser);

            // When the user's login changes, which the LHN rules read for every report
            currentUserPersonalDetails = {accountID: 12345, login: 'new@example.com'};
            rerender({});
            await waitForBatchedUpdatesWithAct();

            // Then every report is rechecked, including the hidden one
            expect(mockSidebarUtils.updateReportsToDisplayInLHN).toHaveBeenCalledWith(
                expect.objectContaining({updatedReportsKeys: expect.arrayContaining([reportKey('1'), reportKey(hiddenReport.reportID)])}),
            );
        });
    });
});

import LHNOrderIndex from '@libs/LHNOrderIndex/LHNOrderIndex';
import type {LHNOrderInputs, LHNOrderReport} from '@libs/LHNOrderIndex/types';

import ONYXKEYS from '@src/ONYXKEYS';

import {createSidebarReportsCollection, createSidebarTestData} from '../../../utils/collections/sidebarReports';
import {localeCompare} from '../../../utils/TestHelper';

const reportKey = (reportID: string) => `${ONYXKEYS.COLLECTION.REPORT}${reportID}`;
const archivedPairs = (reportIDs: string[]) =>
    Object.fromEntries(reportIDs.map((reportID) => [`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`, {private_isArchived: '2024-01-01 10:00:00'}]));
const drafts = (reportIDs: string[]) => Object.fromEntries(reportIDs.map((reportID) => [`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`, 'Draft']));

function createInputs(reportsToDisplay: LHNOrderInputs['reportsToDisplay'], inputs: Partial<LHNOrderInputs> = {}): LHNOrderInputs {
    return {reportsToDisplay, reportAttributes: undefined, reportNameValuePairs: undefined, draftComments: undefined, isInDefaultMode: true, localeCompare, ...inputs};
}

/** Ten reports keyed by reportID, two in each LHN group, whose names and dates order each group differently. */
function createReportsInEveryGroup() {
    const reportsToDisplay = createSidebarReportsCollection([
        {reportName: 'Zebra', isPinned: true, lastVisibleActionCreated: '2024-01-01 10:00:00'},
        {reportName: 'Alpha', isPinned: true, lastVisibleActionCreated: '2024-01-02 10:00:00'},
        {reportName: 'Charlie', hasErrorsOtherThanFailedReceipt: true, lastVisibleActionCreated: '2024-01-03 10:00:00'},
        {reportName: 'Beta', hasErrorsOtherThanFailedReceipt: true, lastVisibleActionCreated: '2024-01-04 10:00:00'},
        {reportName: 'Echo', lastVisibleActionCreated: '2024-01-05 10:00:00'},
        {reportName: 'Delta', lastVisibleActionCreated: '2024-01-06 10:00:00'},
        {reportName: 'Hotel', lastVisibleActionCreated: '2024-01-07 10:00:00'},
        {reportName: 'Golf', lastVisibleActionCreated: '2024-01-08 10:00:00'},
        {reportName: 'India', lastVisibleActionCreated: '2024-01-09 10:00:00'},
        {reportName: 'Juliet', lastVisibleActionCreated: '2024-01-10 10:00:00'},
    ]);
    return createInputs(reportsToDisplay, {draftComments: drafts(['4', '5']), reportNameValuePairs: archivedPairs(['8', '9'])});
}

describe('LHNOrderIndex', () => {
    describe('groups', () => {
        it('should order the groups as pinned and GBR, errors, drafts, the rest, then archived', () => {
            // Given one report in each group, all active at the same time
            const {reports, reportNameValuePairs} = createSidebarTestData();

            // When the order is built with a draft in report 2
            const order = new LHNOrderIndex().update(createInputs(reports, {reportNameValuePairs, draftComments: drafts(['2'])}));

            // Then the groups come in their fixed order regardless of names and dates
            expect(order.reportIDs).toEqual(['0', '1', '2', '3', '4']);
        });

        it('should put a report that requires attention in the first group', () => {
            // Given a plain report and a report that requires attention, named to sort after it
            const reportsToDisplay = createSidebarReportsCollection([{reportName: 'Normal'}, {reportName: 'Zulu', requiresAttention: true}]);

            // When the order is built
            const order = new LHNOrderIndex().update(createInputs(reportsToDisplay));

            // Then the report that requires attention comes first
            expect(order.reportIDs).toEqual(['1', '0']);
        });

        it('should leave out a report without a reportID', () => {
            // Given a displayed report whose reportID is empty
            const reportsToDisplay = createSidebarReportsCollection([{reportName: 'Valid Report'}, {reportName: 'Invalid Report'}]);
            reportsToDisplay['1'] = {...reportsToDisplay['1'], reportID: ''};

            // When the order is built
            const order = new LHNOrderIndex().update(createInputs(reportsToDisplay));

            // Then only the report with a reportID is listed
            expect(order.reportIDs).toEqual(['0']);
        });

        it('should return an empty order without reports', () => {
            // Given no displayed reports

            // When the order is built
            const order = new LHNOrderIndex().update(createInputs({}));

            // Then every list is empty
            expect(order).toEqual({reportIDs: [], todoReportIDs: [], unreadReportIDs: [], oldestUnreadActionCreated: undefined});
        });
    });

    describe('order within a group', () => {
        it('should order by name in the first three groups and by recency in the last two in the most recent mode', () => {
            // Given two reports in each group
            const inputs = createReportsInEveryGroup();

            // When the order is built in the most recent mode
            const order = new LHNOrderIndex().update(inputs);

            // Then pinned (Alpha, Zebra), errors (Beta, Charlie) and drafts (Delta, Echo) are by name, the rest (Golf, Hotel) and archived (Juliet, India) newest first
            expect(order.reportIDs).toEqual(['1', '0', '3', '2', '5', '4', '7', '6', '9', '8']);
        });

        it('should order every group by name in the focus mode', () => {
            // Given two reports in each group
            const inputs = createReportsInEveryGroup();

            // When the order is built in the focus mode
            const order = new LHNOrderIndex().update({...inputs, isInDefaultMode: false});

            // Then each group is by name, including the rest (Golf, Hotel) and archived (India, Juliet)
            expect(order.reportIDs).toEqual(['1', '0', '3', '2', '5', '4', '7', '6', '8', '9']);
        });

        it('should put a report without a display name before the named ones', () => {
            // Given a pinned report without a name and a pinned report named Alpha
            const reportsToDisplay = createSidebarReportsCollection([
                {reportName: 'Alpha', isPinned: true},
                {reportName: '', isPinned: true},
            ]);

            // When the order is built
            const order = new LHNOrderIndex().update(createInputs(reportsToDisplay));

            // Then the empty name sorts first
            expect(order.reportIDs).toEqual(['1', '0']);
        });

        it('should put a report without a visible action after the dated ones in the most recent mode', () => {
            // Given a report without a visible action, named to sort before a dated one
            const reportsToDisplay = createSidebarReportsCollection([{reportName: 'Alpha'}, {reportName: 'Beta', lastVisibleActionCreated: '2024-01-02 10:00:00'}]);
            reportsToDisplay['0'] = {...reportsToDisplay['0'], lastVisibleActionCreated: undefined};

            // When the order is built in the most recent mode
            const order = new LHNOrderIndex().update(createInputs(reportsToDisplay));

            // Then the undated report counts as the least recent and comes last
            expect(order.reportIDs).toEqual(['1', '0']);
        });

        it('should fall back to the locale order when names differ only in case', () => {
            // Given two pinned reports whose names differ only in case
            const reportsToDisplay = createSidebarReportsCollection([
                {reportName: 'alpha', isPinned: true},
                {reportName: 'Alpha', isPinned: true},
            ]);

            // When the order is built with a collator that puts upper case first
            const order = new LHNOrderIndex().update(createInputs(reportsToDisplay));

            // Then the collator decides between them
            expect(order.reportIDs).toEqual(['1', '0']);
        });

        it('should break a full tie by reportID, whatever order the reports come in', () => {
            // Given two reports with the same name and date, listed with the higher reportID first
            const [first, second] = Object.values(createSidebarReportsCollection([{reportName: 'Same'}, {reportName: 'Same'}]));
            if (!first || !second) {
                throw new Error('Expected two reports');
            }
            const reportsToDisplay = {[reportKey(second.reportID)]: second, [reportKey(first.reportID)]: first};

            // When the order is built
            const order = new LHNOrderIndex().update(createInputs(reportsToDisplay));

            // Then the lower reportID comes first
            expect(order.reportIDs).toEqual(['0', '1']);
        });
    });

    describe('updates', () => {
        it('should match a fresh build after every kind of write', () => {
            // Given an index built from reports in every group
            const index = new LHNOrderIndex();
            let inputs = createReportsInEveryGroup();
            index.update(inputs);
            const writeReport = (reportID: string, changes: Partial<LHNOrderReport>) => {
                const report = inputs.reportsToDisplay[reportID];
                if (!report) {
                    throw new Error(`Report ${reportID} is not displayed`);
                }
                return {...inputs.reportsToDisplay, [reportID]: {...report, ...changes}};
            };
            const removedReportID = '3';
            const renamedReportID = '9';
            const {[removedReportID]: removedReport, ...reportsWithoutRemoved} = inputs.reportsToDisplay;
            const writes: Array<() => LHNOrderInputs> = [
                () => ({...inputs, reportsToDisplay: writeReport('6', {lastVisibleActionCreated: '2024-02-01 10:00:00'})}),
                () => ({...inputs, reportsToDisplay: writeReport('7', {isPinned: true})}),
                () => ({...inputs, reportsToDisplay: writeReport('0', {isPinned: false})}),
                () => ({...inputs, reportsToDisplay: writeReport('2', {hasErrorsOtherThanFailedReceipt: false, isUnreadReport: true})}),
                () => ({...inputs, draftComments: drafts(['4', '6'])}),
                () => ({...inputs, reportNameValuePairs: archivedPairs(['8', '7'])}),
                () => ({...inputs, reportAttributes: {[renamedReportID]: {reportName: 'Aardvark', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}}}}),
                () => ({...inputs, reportsToDisplay: reportsWithoutRemoved}),
                () => ({...inputs, reportsToDisplay: {...inputs.reportsToDisplay, [removedReportID]: removedReport}}),
                () => ({...inputs, isInDefaultMode: false}),
                () => ({...inputs, reportsToDisplay: writeReport('5', {lastVisibleActionCreated: '2023-01-01 10:00:00', requiresAttention: true})}),
            ];

            for (const write of writes) {
                // When each write is applied to the same index
                inputs = write();
                const order = index.update(inputs);

                // Then the order equals one built from scratch for the same inputs
                expect(order).toEqual(new LHNOrderIndex().update(inputs));
            }
        });

        it('should keep the same order object when no row changed', () => {
            // Given an index built from reports in every group
            const index = new LHNOrderIndex();
            const inputs = createReportsInEveryGroup();
            const order = index.update(inputs);

            // When the inputs are rebuilt with new containers but the same content, as on a derived value recompute
            const nextOrder = index.update({...inputs, reportsToDisplay: {...inputs.reportsToDisplay}, reportAttributes: {}, draftComments: {...inputs.draftComments}});

            // Then the order keeps its identity, so nothing downstream renders again
            expect(nextOrder).toBe(order);
        });

        it('should reorder when only the priority mode changes', () => {
            // Given an order built in the most recent mode
            const index = new LHNOrderIndex();
            const inputs = createReportsInEveryGroup();
            index.update(inputs);

            // When the same reports are ordered in the focus mode
            const order = index.update({...inputs, isInDefaultMode: false});

            // Then the order is the focus mode one
            expect(order.reportIDs).toEqual(['1', '0', '3', '2', '5', '4', '7', '6', '8', '9']);
        });

        it('should move a report to the archived group when only its archive flag changes', () => {
            // Given two displayed reports, the older one active
            const index = new LHNOrderIndex();
            const reportsToDisplay = createSidebarReportsCollection([{lastVisibleActionCreated: '2024-01-02 10:00:00'}, {lastVisibleActionCreated: '2024-01-01 10:00:00'}]);
            index.update(createInputs(reportsToDisplay));

            // When the newer report is archived, which writes its name-value pairs but not the report itself
            const order = index.update(createInputs(reportsToDisplay, {reportNameValuePairs: archivedPairs(['0'])}));

            // Then it moves below the active report
            expect(order.reportIDs).toEqual(['1', '0']);
        });
    });

    describe('Inbox tabs', () => {
        it('should list the To-do and Unread reports in the LHN order', () => {
            // Given reports that require attention, have errors, are unread, or none of these
            const reportsToDisplay = createSidebarReportsCollection([
                {reportName: 'Delta'},
                {reportName: 'Charlie', requiresAttention: true},
                {reportName: 'Bravo', hasErrorsOtherThanFailedReceipt: true},
                {reportName: 'Alpha'},
            ]);
            reportsToDisplay['0'] = {...reportsToDisplay['0'], isUnreadReport: true};
            reportsToDisplay['1'] = {...reportsToDisplay['1'], isUnreadReport: true};

            // When the order is built
            const order = new LHNOrderIndex().update(createInputs(reportsToDisplay));

            // Then To-do lists the GBR and RBR reports and Unread the unread ones, each in the order of the full list
            expect(order.reportIDs).toEqual(['1', '2', '3', '0']);
            expect(order.todoReportIDs).toEqual(['1', '2']);
            expect(order.unreadReportIDs).toEqual(['1', '0']);
        });

        it('should report the newest action of the least recently active unread report', () => {
            // Given two unread reports and an older one that is read
            const reportsToDisplay = createSidebarReportsCollection([
                {lastVisibleActionCreated: '2024-01-03 10:00:00'},
                {lastVisibleActionCreated: '2024-01-02 10:00:00'},
                {lastVisibleActionCreated: '2024-01-01 10:00:00'},
            ]);
            reportsToDisplay['0'] = {...reportsToDisplay['0'], isUnreadReport: true};
            reportsToDisplay['1'] = {...reportsToDisplay['1'], isUnreadReport: true};

            // When the order is built
            const order = new LHNOrderIndex().update(createInputs(reportsToDisplay));

            // Then the oldest unread action is the older unread report's, not the read report's
            expect(order.oldestUnreadActionCreated).toBe('2024-01-02 10:00:00');
        });
    });
});

import {getJsLhnOrderStats, resetJsLhnOrderStore, updateJsLhnOrder} from '@libs/LhnOrderIndex/JsLhnOrderStore';
import type {LhnIndexInputs} from '@libs/LhnOrderIndex/types';
import SidebarUtils from '@libs/SidebarUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {buildLhnIndexInputs, REPORT_COUNT, sidebarOrder, withoutReport, withReportChange} from '../../utils/collections/lhnIndexInputs';

/**
 * The JS arm of the LHN order POC: the same rows as the SQL arm, ordered by splicing sorted lists instead of by an
 * `ORDER BY`. Every test compares the index with `sortReportsToDisplayInLHN` over the same inputs, because the
 * whole point of the incremental order is that it is indistinguishable from the one the sidebar shows today.
 */
const WRITE_SEQUENCE_LENGTH = 200;

/** A report the LHN had dropped coming back, with the entry it started from. */
function withReportRestored(inputs: LhnIndexInputs, pristine: LhnIndexInputs, reportID: string): LhnIndexInputs {
    const reportKey: `${typeof ONYXKEYS.COLLECTION.REPORT}${string}` = `${ONYXKEYS.COLLECTION.REPORT}${reportID}`;
    return {...inputs, reportsToDisplay: {...inputs.reportsToDisplay, [reportKey]: pristine.reportsToDisplay[reportKey]}};
}

describe('the incremental JS LHN order', () => {
    beforeEach(() => {
        resetJsLhnOrderStore();
    });

    it('orders the first pass the way the sidebar does', () => {
        const inputs = buildLhnIndexInputs();

        expect(updateJsLhnOrder(inputs, 'default')?.reportIDs).toEqual(sidebarOrder(inputs));
        expect(getJsLhnOrderStats().lastUpsertCount).toBe(REPORT_COUNT);
    });

    it('rebuilds one row for a write to one report and still matches the sidebar', () => {
        updateJsLhnOrder(buildLhnIndexInputs(), 'default');
        const first = buildLhnIndexInputs();
        updateJsLhnOrder(first, 'default');

        const second = withReportChange(first, '5', {lastVisibleActionCreated: '2024-03-31 23:00:00.000'});
        const order = updateJsLhnOrder(second, 'default');

        expect(getJsLhnOrderStats().lastUpsertCount).toBe(1);
        expect(getJsLhnOrderStats().lastCandidateCount).toBe(1);
        expect(order?.reportIDs).toEqual(sidebarOrder(second));
    });

    it('follows a display name that only changed in the derived attributes', () => {
        const first = buildLhnIndexInputs();
        updateJsLhnOrder(first, 'default');

        const renamedReportID = '12';
        const renamed: LhnIndexInputs = {
            ...first,
            reportAttributes: {
                ...first.reportAttributes,
                [renamedReportID]: {reportName: 'Aaa renamed', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
            },
        };

        expect(updateJsLhnOrder(renamed, 'default')?.reportIDs).toEqual(sidebarOrder(renamed));
    });

    it('moves a report to the draft group when a draft appears', () => {
        const first = buildLhnIndexInputs();
        updateJsLhnOrder(first, 'default');

        const draftKey: `${typeof ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${string}` = `${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}3`;
        const withDraft: LhnIndexInputs = {...first, draftComments: {...first.draftComments, [draftKey]: 'a new draft'}};

        expect(updateJsLhnOrder(withDraft, 'default')?.reportIDs).toEqual(sidebarOrder(withDraft));
    });

    it('drops a report that left the displayed set', () => {
        const first = buildLhnIndexInputs();
        updateJsLhnOrder(first, 'default');

        const withoutOne = withoutReport(first, '8');
        const order = updateJsLhnOrder(withoutOne, 'default');

        expect(getJsLhnOrderStats().lastDeleteCount).toBe(1);
        expect(order?.reportIDs).toEqual(sidebarOrder(withoutOne));
    });

    it('keeps the two Inbox tabs in the same order as the sidebar filter', () => {
        const inputs = buildLhnIndexInputs();
        const order = updateJsLhnOrder(inputs, 'default');
        const ordered = sidebarOrder(inputs);

        expect(order?.unreadReportIDs).toEqual(SidebarUtils.filterReportsForInboxTab(ordered, inputs.reportsToDisplay, CONST.INBOX_TAB.UNREAD));
        expect(order?.todoReportIDs).toEqual(SidebarUtils.filterReportsForInboxTab(ordered, inputs.reportsToDisplay, CONST.INBOX_TAB.TODO));
    });

    it('orders the focus mode alphabetically, the way the sidebar does', () => {
        const inputs = buildLhnIndexInputs();

        expect(updateJsLhnOrder(inputs, 'focus')?.reportIDs).toEqual(sidebarOrder(inputs, CONST.PRIORITY_MODE.GSD));
    });

    it('re-sorts everything when the priority mode changes', () => {
        const inputs = buildLhnIndexInputs();
        updateJsLhnOrder(inputs, 'default');

        expect(updateJsLhnOrder(inputs, 'focus')?.reportIDs).toEqual(sidebarOrder(inputs, CONST.PRIORITY_MODE.GSD));
        expect(updateJsLhnOrder(inputs, 'default')?.reportIDs).toEqual(sidebarOrder(inputs, CONST.PRIORITY_MODE.DEFAULT));
    });

    it('answers a pass that changed nothing with the same order object', () => {
        const inputs = buildLhnIndexInputs();
        const first = updateJsLhnOrder(inputs, 'default');
        const feedCount = getJsLhnOrderStats().feedCount;

        expect(updateJsLhnOrder(inputs, 'default')).toBe(first);
        expect(getJsLhnOrderStats().feedCount).toBe(feedCount);
    });

    it('still matches the sidebar after a long sequence of writes, and never scans a list to find a row', () => {
        const pristine = buildLhnIndexInputs();
        let inputs = pristine;
        updateJsLhnOrder(inputs, 'default');

        for (let step = 1; step <= WRITE_SEQUENCE_LENGTH; step++) {
            const reportID = (((step * 23) % REPORT_COUNT) + 1).toString();
            if (!(`${ONYXKEYS.COLLECTION.REPORT}${reportID}` in inputs.reportsToDisplay)) {
                inputs = withReportRestored(inputs, pristine, reportID);
            } else if (step % 17 === 0) {
                inputs = withoutReport(inputs, reportID);
            } else if (step % 5 === 0) {
                inputs = withReportChange(inputs, reportID, {isUnreadReport: step % 10 === 0, isPinned: step % 15 === 0});
            } else if (step % 7 === 0) {
                inputs = withReportChange(inputs, reportID, {reportName: `Renamed ${step.toString().padStart(3, '0')}`});
            } else {
                inputs = withReportChange(inputs, reportID, {lastVisibleActionCreated: `2024-04-0${(step % 9) + 1} 11:${(step % 60).toString().padStart(2, '0')}:00.000`});
            }
            const order = updateJsLhnOrder(inputs, 'default');
            expect(order?.reportIDs).toEqual(sidebarOrder(inputs));
        }

        expect(getJsLhnOrderStats().repairCount).toBe(0);
    });
});

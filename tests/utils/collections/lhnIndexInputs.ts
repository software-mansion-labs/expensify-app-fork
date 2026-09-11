import type {ReportsToDisplayInLHN} from '@hooks/useSidebarOrderedReports';

import type {LhnIndexInputs} from '@libs/LhnOrderIndex/types';
import SidebarUtils from '@libs/SidebarUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportNameValuePairs} from '@src/types/onyx';
import type {ReportAttributesDerivedValue} from '@src/types/onyx/DerivedValues';

import type {ValueOf} from 'type-fest';

import {localeCompare} from '../TestHelper';

/**
 * The inputs of the LHN index as the sidebar hands them over, for the parity tests of both POC arms: a fixture that
 * puts reports in all five groups, plus the helpers that change one report the way `updateReportsToDisplayInLHN`
 * does, keeping every untouched entry by reference.
 */
const REPORT_COUNT = 40;
const DRAFT_EVERY = 6;
const ARCHIVED_EVERY = 9;
const PINNED_EVERY = 7;
const UNREAD_EVERY = 4;
const ATTENTION_EVERY = 11;
const ERROR_EVERY = 13;

function buildLhnIndexInputs(): LhnIndexInputs {
    const reportsToDisplay: ReportsToDisplayInLHN = {};
    const reportAttributes: ReportAttributesDerivedValue['reports'] = {};
    const reportNameValuePairs: Record<string, ReportNameValuePairs> = {};
    const draftComments: Record<string, string> = {};

    for (let index = 1; index <= REPORT_COUNT; index++) {
        const reportID = index.toString();
        const reportName = `Chat ${index.toString().padStart(3, '0')}`;
        const minutes = (index * 17) % 60;
        const base: ReportsToDisplayInLHN[string] = {
            reportID,
            reportName,
            type: CONST.REPORT.TYPE.CHAT,
            chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
            lastVisibleActionCreated: `2024-03-0${(index % 9) + 1} 10:${minutes.toString().padStart(2, '0')}:00.000`,
            isPinned: index % PINNED_EVERY === 0,
            requiresAttention: index % ATTENTION_EVERY === 0,
            hasErrorsOtherThanFailedReceipt: index % ERROR_EVERY === 0,
            isUnreadReport: index % UNREAD_EVERY === 0,
        };
        reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`] = base;
        reportAttributes[reportID] = {
            reportName,
            isEmpty: false,
            brickRoadStatus: undefined,
            requiresAttention: index % ATTENTION_EVERY === 0,
            reportErrors: {},
        };
        if (index % ARCHIVED_EVERY === 0) {
            reportNameValuePairs[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`] = {private_isArchived: '2024-01-01 10:00:00.000'};
        }
        if (index % DRAFT_EVERY === 0) {
            draftComments[`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`] = `draft ${index}`;
        }
    }

    return {reportsToDisplay, reportAttributes, reportNameValuePairs, draftComments};
}

/** One write, the way the sidebar hands it over: a new map with one new entry and every other entry by reference. */
function withReportChange(inputs: LhnIndexInputs, reportID: string, changes: Partial<ReportsToDisplayInLHN[string]>): LhnIndexInputs {
    const reportKey: `${typeof ONYXKEYS.COLLECTION.REPORT}${string}` = `${ONYXKEYS.COLLECTION.REPORT}${reportID}`;
    const report = inputs.reportsToDisplay[reportKey];
    if (!report) {
        throw new Error(`report ${reportID} is not in the fixture`);
    }
    return {...inputs, reportsToDisplay: {...inputs.reportsToDisplay, [reportKey]: {...report, ...changes}}};
}

function withoutReport(inputs: LhnIndexInputs, reportID: string): LhnIndexInputs {
    const reportsToDisplay = {...inputs.reportsToDisplay};
    delete reportsToDisplay[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
    return {...inputs, reportsToDisplay};
}

/** The sidebar sorts on a boolean map keyed by bare report id, while a row reads the draft collection itself. */
function toDraftFlags(draftComments: LhnIndexInputs['draftComments']): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    for (const [draftKey, draft] of Object.entries(draftComments ?? {})) {
        if (draft) {
            flags[draftKey.replace(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT, '')] = true;
        }
    }
    return flags;
}

/** Today's order over the same inputs, which is what both arms have to reproduce. */
function sidebarOrder(inputs: LhnIndexInputs, priorityMode: ValueOf<typeof CONST.PRIORITY_MODE> = CONST.PRIORITY_MODE.DEFAULT): string[] {
    return SidebarUtils.sortReportsToDisplayInLHN(
        inputs.reportsToDisplay,
        priorityMode,
        localeCompare,
        toDraftFlags(inputs.draftComments),
        inputs.reportNameValuePairs,
        inputs.reportAttributes,
    );
}

export {buildLhnIndexInputs, withReportChange, withoutReport, toDraftFlags, sidebarOrder, REPORT_COUNT};

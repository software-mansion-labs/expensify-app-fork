import type {ReportsToDisplayInLHN} from '@hooks/useSidebarOrderedReports';

import type {ReportNameValuePairs} from '@src/types/onyx';
import type {ReportAttributesDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxCollection} from 'react-native-onyx';

/**
 * Everything a row of the LHN index is derived from. The four containers are compared by reference, the way
 * `../../poc-report-actions` proved Onyx keeps the identity of members it did not touch, so a write to one
 * report rebuilds one row.
 */
type LhnIndexInputs = {
    /** The reports the LHN displays, as `useSidebarOrderedReports` keeps them (keyed `report_<id>`). */
    reportsToDisplay: ReportsToDisplayInLHN;
    /** Holds the display name the order sorts on and the attention flag the first bucket uses. */
    reportAttributes: ReportAttributesDerivedValue['reports'] | undefined;
    /** Holds `private_isArchived`, which decides the archived bucket. */
    reportNameValuePairs: OnyxCollection<ReportNameValuePairs> | undefined;
    /** The draft comment collection, straight from Onyx, which decides the draft bucket. */
    draftComments: OnyxCollection<string> | undefined;
};

/** Which rows the next request has to carry. */
type LhnIndexChanges = {
    /** Report ids whose row has to be rebuilt. */
    upsertIDs: string[];
    /** Report ids the LHN no longer displays. */
    deleteIDs: string[];
    /** When true every row is sent and the table is emptied first. */
    full: boolean;
};

/** The three lists the sidebar renders, as the engine last returned them. */
type LhnOrderSnapshot = {
    reportIDs: string[];
    unreadReportIDs: string[];
    todoReportIDs: string[];
    /** The input version this order was computed from, so a caller can tell a stale order from a current one. */
    version: number;
};

export type {LhnIndexInputs, LhnIndexChanges, LhnOrderSnapshot};

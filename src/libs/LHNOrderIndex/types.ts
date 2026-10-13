import type {Report, ReportNameValuePairs} from '@src/types/onyx';
import type {ReportAttributesDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxCollection} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import type LHN_ORDER_BUCKET from './LHN_ORDER_BUCKET';

/** A report the LHN displays, with the flags the LHN computes for it. */
type LHNOrderReport = Report & {
    hasErrorsOtherThanFailedReceipt?: boolean;
    requiresAttention?: boolean;
    isUnreadReport?: boolean;
};

type LocaleCompare = (first: string, second: string) => number;

/** Everything the LHN order is derived from. */
type LHNOrderInputs = {
    /** The reports the LHN displays, keyed by their Onyx report key. */
    reportsToDisplay: Record<string, LHNOrderReport | undefined>;

    /** Holds the display names the order sorts on. */
    reportAttributes: ReportAttributesDerivedValue['reports'] | undefined;

    /** Holds `private_isArchived`, which decides the archived group. */
    reportNameValuePairs: OnyxCollection<ReportNameValuePairs>;

    /** Decides the draft group. */
    draftComments: OnyxCollection<string>;

    /** The most recent priority mode orders the last two groups by recency, the focus mode by name. */
    isInDefaultMode: boolean;

    localeCompare: LocaleCompare;
};

/** The part of a displayed report the LHN order reads. */
type LHNOrderRow = {
    reportID: string;
    bucket: ValueOf<typeof LHN_ORDER_BUCKET>;
    displayName: string;
    sortKey: string;
    /** Empty when the report has no visible action, which orders it as the least recent. */
    lastVisibleActionCreated: string;
    isUnread: boolean;
    isTodo: boolean;
};

/** The LHN order and the Inbox tabs taken from it. */
type LHNOrder = {
    reportIDs: string[];
    todoReportIDs: string[];
    unreadReportIDs: string[];
    /** The newest visible action of the least recently active unread report, undefined without unread reports. */
    oldestUnreadActionCreated: string | undefined;
};

export type {LHNOrderReport, LocaleCompare, LHNOrderInputs, LHNOrderRow, LHNOrder};

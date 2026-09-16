import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {PrivateIsArchivedMap} from '@hooks/usePrivateIsArchivedMap';

import type {SearchOptionsConfig} from '@libs/OptionsListUtils';

import type {Locale, PersonalDetailsList, Policy, Report, ReportAttributesDerivedValue, Rule} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

/**
 * One row per report and per contact of the account: everything the router needs to decide whether a typed query
 * matches that option and where it would rank, and nothing else. Reports and contacts are indexed separately, so
 * a row never has to say which of the two lists it belongs to. The option itself is only built for the rows a
 * query actually selects.
 */
type OptionIndexRow = {
    /** The reportID of a report row, the accountID of a contact row. */
    id: string;

    /** Deburred and lowercased superset of every text the router matches a typed term against. */
    searchText: string;

    /** What the router's own comparator ranks this row by, as a string the matcher can compare directly. */
    orderKey: string;

    /**
     * Whether the router would offer this option at all, as far as the row alone can decide it: its hidden rule
     * and the part of its validity filter that reads nothing but the report or the personal detail.
     */
    isSelectable: boolean;
};

/** Everything the rows are derived from. Each field is an Onyx snapshot or a scalar, and is compared by identity. */
type SearchOptionsIndexInputs = {
    reports: OnyxCollection<Report>;
    personalDetails: OnyxEntry<PersonalDetailsList>;
    reportAttributes: ReportAttributesDerivedValue['reports'] | undefined;
    policies: OnyxCollection<Policy>;
    rules: OnyxCollection<Rule>;
    privateIsArchivedMap: PrivateIsArchivedMap;
    conciergeReportID: string | undefined;
    currentUserAccountID: number;
    locale: Locale | undefined;

    /** The translate function of the active locale. A new identity means the locale changed. */
    translate: LocalizedTranslate;
};

/** What one query selected out of the index: the ids to build options for, and how much was left behind. */
type SearchCandidates = {
    reportIDs: string[];
    accountIDs: string[];

    /** Whether reports beyond the requested window matched too, so a wider window would find more of them. */
    hasMoreReports: boolean;
};

/** What `getSearchOptions` needs besides the option list and the query itself. */
type SearchOptionsFormatConfig = Omit<SearchOptionsConfig, 'options' | 'searchQuery'>;

export type {OptionIndexRow, SearchCandidates, SearchOptionsFormatConfig, SearchOptionsIndexInputs};

import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {PrivateIsArchivedMap} from '@hooks/usePrivateIsArchivedMap';

import type {SearchOptionsConfig} from '@libs/OptionsListUtils';

import type {Locale, PersonalDetailsList, Policy, Report, ReportAttributesDerivedValue} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

/** Everything an index row is derived from. Each field is an Onyx snapshot or a scalar, compared by identity. */
type SearchOptionsIndexInputs = {
    reports: OnyxCollection<Report>;
    personalDetails: OnyxEntry<PersonalDetailsList>;
    reportAttributes: ReportAttributesDerivedValue['reports'] | undefined;
    policies: OnyxCollection<Policy>;
    privateIsArchivedMap: PrivateIsArchivedMap;
    conciergeReportID: string | undefined;
    currentUserAccountID: number;
    locale: Locale | undefined;
    /** The translate function of the active locale; a new identity means the locale changed. */
    translate: LocalizedTranslate;
};

/** The ids a matcher hands back: the router's recency window of reports and alphabetical window of contacts. */
type SearchCandidateIDs = {
    reportIDs: string[];
    accountIDs: string[];
    hasMoreReports: boolean;
    hasMoreContacts: boolean;
};

/** What `getSearchOptions` needs besides the option list and the query. */
type SearchOptionsFormatConfig = Omit<SearchOptionsConfig, 'options' | 'searchQuery'>;

export type {SearchOptionsIndexInputs, SearchCandidateIDs, SearchOptionsFormatConfig};

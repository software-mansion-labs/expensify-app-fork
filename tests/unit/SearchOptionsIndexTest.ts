import type {PrivateIsArchivedMap} from '@hooks/usePrivateIsArchivedMap';

import {clearFilteredOptionListCache, createFilteredOptionList, getSearchOptions} from '@libs/OptionsListUtils';
import type {Options} from '@libs/OptionsListUtils';
import {clearSearchOptionsIndex, feedSearchOptionsIndex, getSearchOptionsFromIndex, requestSearchOptions} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import type {SearchOptionsFormatConfig, SearchOptionsIndexInputs} from '@libs/SearchOptionsIndex/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList, Report, ReportAttributesDerivedValue} from '@src/types/onyx';

import type * as NativeNavigation from '@react-navigation/native';

import Onyx from 'react-native-onyx';

import {convertToDisplayString, translateLocal} from '../utils/TestHelper';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// `isValidReport` asks the navigation state for the focused report, which no test renders.
jest.mock('@react-navigation/native', () => {
    const actualNavigation = jest.requireActual<typeof NativeNavigation>('@react-navigation/native');
    return {
        ...actualNavigation,
        createNavigationContainerRef: () => ({getState: () => jest.fn()}),
    };
});

const CURRENT_USER_ACCOUNT_ID = 1;
const CURRENT_USER_EMAIL = 'me@example.com';
const ZEPHYR_ACCOUNT_ID = 2;
const QUINN_ACCOUNT_ID = 3;
const DM_REPORT_ID = '100';
const GROUP_REPORT_ID = '200';

const personalDetails: PersonalDetailsList = {
    [CURRENT_USER_ACCOUNT_ID]: {accountID: CURRENT_USER_ACCOUNT_ID, login: CURRENT_USER_EMAIL, displayName: 'Current User'},
    [ZEPHYR_ACCOUNT_ID]: {accountID: ZEPHYR_ACCOUNT_ID, login: 'zephyr@example.com', displayName: 'Zephyr Nine'},
    [QUINN_ACCOUNT_ID]: {accountID: QUINN_ACCOUNT_ID, login: 'quinn@example.com', displayName: 'Quinn Ash'},
};

const ACTIVE_PARTICIPANT = {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS};

const reports: Record<`${typeof ONYXKEYS.COLLECTION.REPORT}${string}`, Report> = {
    [`${ONYXKEYS.COLLECTION.REPORT}${DM_REPORT_ID}`]: {
        reportID: DM_REPORT_ID,
        type: CONST.REPORT.TYPE.CHAT,
        lastVisibleActionCreated: '2026-09-10 10:00:00.000',
        participants: {[CURRENT_USER_ACCOUNT_ID]: ACTIVE_PARTICIPANT, [ZEPHYR_ACCOUNT_ID]: ACTIVE_PARTICIPANT},
    },
    [`${ONYXKEYS.COLLECTION.REPORT}${GROUP_REPORT_ID}`]: {
        reportID: GROUP_REPORT_ID,
        chatType: CONST.REPORT.CHAT_TYPE.GROUP,
        type: CONST.REPORT.TYPE.CHAT,
        reportName: 'Quinn and Zephyr trip',
        lastVisibleActionCreated: '2026-09-11 10:00:00.000',
        participants: {[CURRENT_USER_ACCOUNT_ID]: ACTIVE_PARTICIPANT, [ZEPHYR_ACCOUNT_ID]: ACTIVE_PARTICIPANT, [QUINN_ACCOUNT_ID]: ACTIVE_PARTICIPANT},
    },
};

const emptyReportAttributes = {isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}};

const reportAttributes: ReportAttributesDerivedValue['reports'] = {
    [DM_REPORT_ID]: {...emptyReportAttributes, reportName: 'Zephyr Nine'},
    [GROUP_REPORT_ID]: {...emptyReportAttributes, reportName: 'Quinn and Zephyr trip'},
};

const privateIsArchivedMap: PrivateIsArchivedMap = {};

const formatConfig: SearchOptionsFormatConfig = {
    dateFnsLocale: undefined,
    convertToDisplayString,
    translate: translateLocal,
    draftComments: {},
    betas: Object.values(CONST.BETAS),
    loginList: {},
    currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
    currentUserEmail: CURRENT_USER_EMAIL,
    policyCollection: {},
    personalDetails,
    sortedActions: undefined,
    conciergeReportID: undefined,
    rules: {},
    isUsedInChatFinder: true,
    includeReadOnly: true,
    maxResults: CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS,
    includeUserToInvite: true,
    includeRecentReports: true,
    includeCurrentUser: true,
    shouldShowGBR: false,
    shouldUnreadBeBold: true,
};

function toInputs(overrides: Partial<SearchOptionsIndexInputs> = {}): SearchOptionsIndexInputs {
    return {
        reports,
        personalDetails,
        reportAttributes,
        policies: {},
        rules: {},
        privateIsArchivedMap,
        conciergeReportID: undefined,
        currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
        locale: undefined,
        translate: translateLocal,
        ...overrides,
    };
}

/** Today's path: the option list built over the whole account in search mode, then formatted by the router. */
function getOptionsWithoutIndex(inputs: SearchOptionsIndexInputs, query: string): Options {
    clearFilteredOptionListCache();
    const optionList = createFilteredOptionList(
        inputs.personalDetails,
        inputs.reports,
        inputs.reportAttributes,
        inputs.privateIsArchivedMap,
        inputs.policies,
        {
            currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
            dateFnsLocale: undefined,
            convertToDisplayString,
            conciergeReportID: undefined,
            maxRecentReports: 100,
            includeP2P: true,
            isSearching: true,
            deferContactsUntilSearch: true,
        },
        inputs.rules,
    );
    return getSearchOptions({...formatConfig, options: optionList, searchQuery: query}).options;
}

function getOptionsFromIndex(query: string): Options {
    requestSearchOptions(query, formatConfig);
    const options = getSearchOptionsFromIndex();
    if (!options) {
        throw new Error(`The index answered nothing for "${query}"`);
    }
    return options;
}

function toRowIDs(options: Options): string[] {
    return [...options.recentReports.map((option) => `report:${option.reportID}`), ...options.personalDetails.map((option) => `contact:${option.accountID}`)];
}

describe('SearchOptionsIndex', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        await Onyx.merge(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: CURRENT_USER_EMAIL});
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, personalDetails);
        await waitForBatchedUpdates();
    });

    afterAll(() => Onyx.clear());

    beforeEach(() => {
        clearSearchOptionsIndex();
        feedSearchOptionsIndex(toInputs());
    });

    it('returns the rows today returns, in the same order', () => {
        const query = 'zephyr';
        const rowIDs = toRowIDs(getOptionsFromIndex(query));

        expect(rowIDs).toEqual([`report:${GROUP_REPORT_ID}`, `contact:${ZEPHYR_ACCOUNT_ID}`]);
        expect(rowIDs).toEqual(toRowIDs(getOptionsWithoutIndex(toInputs(), query)));
    });

    it('answers a query a report was only renamed into, after an incremental feed', () => {
        expect(getOptionsFromIndex('sailing').recentReports).toHaveLength(0);

        const renamedInputs = toInputs({
            reports: {...reports, [`${ONYXKEYS.COLLECTION.REPORT}${GROUP_REPORT_ID}`]: {...reports[`${ONYXKEYS.COLLECTION.REPORT}${GROUP_REPORT_ID}`], reportName: 'Sailing weekend'}},
            reportAttributes: {...reportAttributes, [GROUP_REPORT_ID]: {...emptyReportAttributes, reportName: 'Sailing weekend'}},
        });
        feedSearchOptionsIndex(renamedInputs);

        expect(toRowIDs(getOptionsFromIndex('sailing'))).toEqual(toRowIDs(getOptionsWithoutIndex(renamedInputs, 'sailing')));
        expect(getOptionsFromIndex('sailing').recentReports).toHaveLength(1);
    });
});

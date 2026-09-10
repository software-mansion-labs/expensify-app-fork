import type {PrivateIsArchivedMap} from '@hooks/usePrivateIsArchivedMap';

import {clearFilteredOptionListCache, createFilteredOptionList, getSearchOptions} from '@libs/OptionsListUtils';
import type {Options} from '@libs/OptionsListUtils';
import {
    CANDIDATE_WINDOW,
    feedSearchOptionsIndex,
    getSearchOptionsIndexSnapshot,
    getSearchOptionsIndexStats,
    requestSearchOptions,
    resetSearchOptionsIndexStore,
} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import type {SearchOptionsFormatConfig, SearchOptionsIndexInputs} from '@libs/SearchOptionsIndex/types';
import {setSearchRouterEngineMode} from '@libs/SqlEngine/searchRouterEngineMode';
import type {SearchRouterEngineMode} from '@libs/SqlEngine/searchRouterEngineMode';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';
import type Login from '@src/types/onyx/Login';

import type * as NativeNavigation from '@react-navigation/native';
import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import type {SearchRouterDataset} from '../../utils/collections/searchRouterDataset';

import buildSearchRouterDataset from '../../utils/collections/searchRouterDataset';
import {getMockEngineOptionRowCount, getMockEngineSearchCount, resetMockEngine} from '../../utils/mockSqlEngineClient';
import {convertToDisplayString, translateLocal} from '../../utils/TestHelper';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import, so the stand-in module is pulled in with require
jest.mock('@libs/SqlEngine/EngineClient', () => require('../../utils/mockSqlEngineClient'));

jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual<typeof NativeNavigation>('@react-navigation/native');
    return {
        ...actualNav,
        createNavigationContainerRef: () => ({
            getState: () => jest.fn(),
        }),
    };
});

const CURRENT_USER_ACCOUNT_ID = 1;
const CURRENT_USER_EMAIL = 'me@example.com';
const EMPTY_LOGIN_LIST: OnyxEntry<Login> = {};
const MOCKED_BETAS = Object.values(CONST.BETAS);
const MODES: SearchRouterEngineMode[] = ['js-index', 'sql-like'];
const QUERIES = ['Zephyr', 'zephyr person', 'chat 12', 'group', 'workspace', '#room', 'expense', 'thread', 'user7', 'Ze', 'nothing-matches-this'];

// Half the reports are DMs, so this many contacts gives every contact exactly one DM, as on a real account.
const dataset = buildSearchRouterDataset({reportCount: 600, contactCount: 320, currentUserAccountID: CURRENT_USER_ACCOUNT_ID});

const formatConfig: SearchOptionsFormatConfig = {
    dateFnsLocale: undefined,
    convertToDisplayString,
    translate: translateLocal,
    draftComments: {},
    betas: MOCKED_BETAS,
    loginList: EMPTY_LOGIN_LIST,
    currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
    currentUserEmail: CURRENT_USER_EMAIL,
    policyCollection: dataset.policies,
    personalDetails: dataset.personalDetails,
    sortedActions: undefined,
    conciergeReportID: undefined,
    isUsedInChatFinder: true,
    includeReadOnly: true,
    maxResults: CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS,
    includeUserToInvite: true,
    includeRecentReports: true,
    includeCurrentUser: true,
    shouldShowGBR: false,
    shouldUnreadBeBold: true,
};

function toInputs(data: SearchRouterDataset, privateIsArchivedMap: PrivateIsArchivedMap = data.privateIsArchivedMap): SearchOptionsIndexInputs {
    return {
        reports: data.reports,
        personalDetails: data.personalDetails,
        reportAttributes: data.reportAttributes,
        policies: data.policies,
        privateIsArchivedMap,
        conciergeReportID: undefined,
        currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
        locale: undefined,
        translate: translateLocal,
    };
}

/** Today's path, verbatim: the full option list built in search mode, then `getSearchOptions` over all of it. */
function todayOptions(data: SearchRouterDataset, query: string): Options {
    clearFilteredOptionListCache();
    const optionList = createFilteredOptionList(data.personalDetails, data.reports, data.reportAttributes, data.privateIsArchivedMap, data.policies, {
        currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
        dateFnsLocale: undefined,
        convertToDisplayString,
        conciergeReportID: undefined,
        maxRecentReports: 100,
        includeP2P: true,
        isSearching: true,
        deferContactsUntilSearch: true,
    });
    return getSearchOptions({...formatConfig, options: optionList, searchQuery: query}).options;
}

function ids(options: Options): string[] {
    return [
        ...options.recentReports.map((option) => `r:${option.reportID}`),
        ...options.personalDetails.map((option) => `c:${option.accountID}`),
        `invite:${options.userToInvite?.login ?? ''}`,
    ];
}

async function indexOptions(query: string): Promise<Options> {
    requestSearchOptions(query, formatConfig);
    await waitForBatchedUpdates();
    const snapshot = getSearchOptionsIndexSnapshot();
    if (!snapshot || snapshot.query !== query) {
        throw new Error(`No index result for "${query}"`);
    }
    return snapshot.options;
}

describe("SearchOptionsIndex parity with today's path", () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        await Onyx.merge(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: CURRENT_USER_EMAIL});
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, dataset.personalDetails);
        await waitForBatchedUpdates();
    });

    afterAll(() => Onyx.clear());

    beforeEach(() => {
        resetMockEngine();
        resetSearchOptionsIndexStore();
    });

    afterEach(() => {
        setSearchRouterEngineMode('sql-fts');
    });

    it('builds a dataset the option list admits', () => {
        const options = todayOptions(dataset, 'Zephyr');
        expect(options.recentReports.length).toBeGreaterThan(0);
        expect(options.personalDetails.length).toBeGreaterThan(0);
    });

    describe.each(MODES)('in %s mode', (mode) => {
        beforeEach(() => {
            setSearchRouterEngineMode(mode);
            feedSearchOptionsIndex(toInputs(dataset));
        });

        it.each(QUERIES)('returns the rows today returns for "%s", in the same order', async (query) => {
            expect(ids(await indexOptions(query))).toEqual(ids(todayOptions(dataset, query)));
        });

        it('hands the formatter a candidate window instead of the whole account', async () => {
            await indexOptions('Zephyr');
            const snapshot = getSearchOptionsIndexSnapshot();
            expect(snapshot?.candidateReportCount).toBeLessThanOrEqual(CANDIDATE_WINDOW);
            expect(snapshot?.candidateContactCount).toBeLessThanOrEqual(CANDIDATE_WINDOW);
            expect(getSearchOptionsIndexStats().underflows).toBe(0);
        });

        it('follows a report change through an incremental feed', async () => {
            const before = await indexOptions('renamed');
            expect(before.recentReports).toHaveLength(0);

            const changedID = '1002';
            const key: `${typeof ONYXKEYS.COLLECTION.REPORT}${string}` = `${ONYXKEYS.COLLECTION.REPORT}${changedID}`;
            const changed: Report = {...dataset.reports?.[key], reportID: changedID, lastVisibleActionCreated: '2030-01-01 00:00:00.000'};
            const next: SearchRouterDataset = {
                ...dataset,
                reports: {...dataset.reports, [key]: changed},
                reportAttributes: {
                    ...dataset.reportAttributes,
                    [changedID]: {reportName: 'Renamed chat', isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}},
                },
            };
            const statsBefore = getSearchOptionsIndexStats();
            feedSearchOptionsIndex(toInputs(next));
            const statsAfter = getSearchOptionsIndexStats();

            expect(statsAfter.fullRebuilds).toBe(statsBefore.fullRebuilds);
            expect(statsAfter.upsertedRows - statsBefore.upsertedRows).toBe(1);

            await waitForBatchedUpdates();
            expect(ids(getSearchOptionsIndexSnapshot()?.options ?? before)).toEqual(ids(todayOptions(next, 'renamed')));
        });

        it('drops a report that leaves the collection and rebuilds the contact that lost its DM', async () => {
            const key: `${typeof ONYXKEYS.COLLECTION.REPORT}${string}` = `${ONYXKEYS.COLLECTION.REPORT}1000`;
            const {[key]: removed, ...remainingReports} = dataset.reports;
            expect(removed).toBeDefined();
            const next: SearchRouterDataset = {...dataset, reports: remainingReports};
            const statsBefore = getSearchOptionsIndexStats();
            feedSearchOptionsIndex(toInputs(next));
            const statsAfter = getSearchOptionsIndexStats();

            expect(statsAfter.deletedRows - statsBefore.deletedRows).toBe(1);
            expect(statsAfter.upsertedRows - statsBefore.upsertedRows).toBe(1);
            expect(ids(await indexOptions('Person 0'))).toEqual(ids(todayOptions(next, 'Person 0')));
        });
    });

    it('only posts rows to the engine in a SQL mode', async () => {
        setSearchRouterEngineMode('js-index');
        feedSearchOptionsIndex(toInputs(dataset));
        await indexOptions('Zephyr');
        expect(getMockEngineOptionRowCount()).toBe(0);
        expect(getMockEngineSearchCount()).toBe(0);

        resetSearchOptionsIndexStore();
        setSearchRouterEngineMode('sql-like');
        feedSearchOptionsIndex(toInputs(dataset));
        await indexOptions('Zephyr');
        expect(getMockEngineOptionRowCount()).toBe(getSearchOptionsIndexStats().rowCount);
        expect(getMockEngineSearchCount()).toBe(1);
    });
});

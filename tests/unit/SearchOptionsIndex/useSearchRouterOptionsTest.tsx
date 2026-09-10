import {renderHook} from '@testing-library/react-native';

import useSearchRouterOptions from '@hooks/useSearchRouterOptions';

import {getSearchOptionsIndexStats, resetSearchOptionsIndexStore} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import type {SearchOptionsFormatConfig} from '@libs/SearchOptionsIndex/types';
import {setSearchRouterEngineMode} from '@libs/SqlEngine/searchRouterEngineMode';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type Login from '@src/types/onyx/Login';

import type * as NativeNavigation from '@react-navigation/native';
import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import buildSearchRouterDataset from '../../utils/collections/searchRouterDataset';
import {flushMockEngineReplies, getMockEngineSearchCount, resetMockEngine, setMockEngineDeferred} from '../../utils/mockSqlEngineClient';
import {convertToDisplayString, translateLocal} from '../../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

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
const EMPTY_LOGIN_LIST: OnyxEntry<Login> = {};
const dataset = buildSearchRouterDataset({reportCount: 200, contactCount: 40, currentUserAccountID: CURRENT_USER_ACCOUNT_ID});

const formatConfig: SearchOptionsFormatConfig = {
    dateFnsLocale: undefined,
    convertToDisplayString,
    translate: translateLocal,
    draftComments: {},
    betas: Object.values(CONST.BETAS),
    loginList: EMPTY_LOGIN_LIST,
    currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
    currentUserEmail: 'me@example.com',
    policyCollection: dataset.policies,
    personalDetails: dataset.personalDetails,
    sortedActions: undefined,
    conciergeReportID: undefined,
    maxResults: CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS,
    includeUserToInvite: true,
    includeRecentReports: true,
    includeCurrentUser: true,
    shouldUnreadBeBold: true,
};

describe('useSearchRouterOptions', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        await Onyx.merge(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: 'me@example.com'});
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, dataset.personalDetails);
        await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT, dataset.reports);
        await Onyx.mergeCollection(ONYXKEYS.COLLECTION.POLICY, dataset.policies);
        await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, dataset.reportNameValuePairs);
        await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, {reports: dataset.reportAttributes, locale: null});
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => Onyx.clear());

    beforeEach(() => {
        resetMockEngine();
        resetSearchOptionsIndexStore();
        setSearchRouterEngineMode('sql-like');
    });

    afterEach(() => {
        setSearchRouterEngineMode('sql-fts');
    });

    it('returns nothing while disabled and feeds no rows', async () => {
        const {result} = renderHook(() => useSearchRouterOptions({isEnabled: false, query: 'Zephyr', formatConfig}));
        await waitForBatchedUpdatesWithAct();
        expect(result.current).toBeUndefined();
        expect(getSearchOptionsIndexStats().feeds).toBe(0);
    });

    it('feeds the index on mount and answers the query after one engine round trip', async () => {
        const {result, rerender} = renderHook(({query}: {query: string}) => useSearchRouterOptions({isEnabled: true, query, formatConfig}), {initialProps: {query: ''}});
        await waitForBatchedUpdatesWithAct();
        expect(getSearchOptionsIndexStats().feeds).toBe(1);
        expect(getMockEngineSearchCount()).toBe(0);
        expect(result.current).toBeUndefined();

        rerender({query: 'Zephyr'});
        await waitForBatchedUpdatesWithAct();
        expect(getMockEngineSearchCount()).toBe(1);
        expect(result.current?.recentReports.length).toBeGreaterThan(0);
        expect(result.current?.recentReports.every((option) => !!option.text?.toLowerCase().includes('zephyr') || !!option.login?.includes('zephyr'))).toBe(true);
    });

    it('keeps the previous result while a newer query is in flight and drops the stale reply', async () => {
        const {result, rerender} = renderHook(({query}: {query: string}) => useSearchRouterOptions({isEnabled: true, query, formatConfig}), {initialProps: {query: 'Zephyr'}});
        await waitForBatchedUpdatesWithAct();
        const zephyrIDs = result.current?.recentReports.map((option) => option.reportID);
        expect(zephyrIDs?.length).toBeGreaterThan(0);

        setMockEngineDeferred(true);
        rerender({query: 'Group'});
        await waitForBatchedUpdatesWithAct();
        expect(result.current?.recentReports.map((option) => option.reportID)).toEqual(zephyrIDs);

        rerender({query: 'Group 5'});
        await waitForBatchedUpdatesWithAct();
        flushMockEngineReplies();
        await waitForBatchedUpdatesWithAct();

        expect(getSearchOptionsIndexStats().staleReplies).toBe(1);
        expect(result.current?.recentReports.length).toBeGreaterThan(0);
        expect(result.current?.recentReports.every((option) => option.text?.startsWith('Group') && option.text.includes('5'))).toBe(true);
    });
});

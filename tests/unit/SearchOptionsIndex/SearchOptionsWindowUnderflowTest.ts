import {processSearchString} from '@libs/OptionsListUtils';
import {generateIsEmptyReport, isChatThread} from '@libs/ReportUtils';
import {
    feedSearchOptionsIndex,
    getSearchOptionsIndexSnapshot,
    getSearchOptionsIndexStats,
    requestSearchOptions,
    resetSearchOptionsIndexStore,
} from '@libs/SearchOptionsIndex/SearchOptionsIndexStore';
import {getSearchWindow, REFILL_FACTOR} from '@libs/SearchOptionsIndex/searchWindow';
import {setSearchRouterEngineMode} from '@libs/SqlEngine/searchRouterEngineMode';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type * as NativeNavigation from '@react-navigation/native';

import Onyx from 'react-native-onyx';

import buildSearchRouterDataset from '../../utils/collections/searchRouterDataset';
import {resetMockEngine, searchOptions as searchMockEngine} from '../../utils/mockSqlEngineClient';
import {buildSearchRouterFormatConfig, CURRENT_USER_ACCOUNT_ID, CURRENT_USER_EMAIL, toSearchOptionsIndexInputs} from '../../utils/searchRouterHarness';
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

const REPORT_COUNT = 40_000;
const CONTACT_COUNT = 5_000;
const QUERY_COUNT = 500;
/** The single JS-only rejection this dataset reaches, kept as a label so a new one stands out in the diff. */
const EMPTY_CHAT_THREAD = 'empty chat thread';
/** The contact rejection that depends on the result itself: its login already shows as one of the recent reports. */
const SHOWN_AS_RECENT_REPORT = 'login already shown as a recent report';
/** Reported when the formatter reorders the window, which is what makes its second sort pass redundant. */
const ORDER_DIFFERS = 'formatter reordered the engine window';
/** Measured at 12 of 500 on 2026-09-14; a ratchet, so a predicate that starts leaking shows up as more refills. */
const MAX_UNDERFLOWS = 12;
const RANDOM_MODULUS = 2_147_483_647;
const RANDOM_MULTIPLIER = 16_807;
/** Words the dataset builds its names from, so a drawn term reaches a dense part of the index. */
const VOCABULARY = ['zephyr', 'chat', 'group', 'workspace', 'room', 'expense', 'report', 'thread', 'person', 'user', 'example.com', 'current'];

const dataset = buildSearchRouterDataset({reportCount: REPORT_COUNT, contactCount: CONTACT_COUNT, currentUserAccountID: CURRENT_USER_ACCOUNT_ID});
const formatConfig = buildSearchRouterFormatConfig(dataset);
/** A multiplicative generator, so the queries this suite draws are the same ones on the next run. */
function createRandom(seed: number): () => number {
    let state = seed % RANDOM_MODULUS;
    return () => {
        state = (state * RANDOM_MULTIPLIER) % RANDOM_MODULUS;
        return state / RANDOM_MODULUS;
    };
}

/** One term: a whole word, a prefix of one, or a word with a digit tail, which is how the dataset names read. */
function drawTerm(random: () => number): string {
    const word = VOCABULARY.at(Math.floor(random() * VOCABULARY.length)) ?? 'chat';
    const shape = Math.floor(random() * 4);
    if (shape === 0) {
        return word.slice(0, 1 + Math.floor(random() * Math.min(3, word.length)));
    }
    if (shape === 1) {
        return `${word} ${Math.floor(random() * REPORT_COUNT)}`;
    }
    if (shape === 2) {
        return String(Math.floor(random() * REPORT_COUNT));
    }
    return word;
}

function buildQueries(count: number): string[] {
    const random = createRandom(20_260_914);
    const queries = new Set<string>();
    while (queries.size < count) {
        queries.add(random() < 0.3 ? `${drawTerm(random)} ${drawTerm(random)}` : drawTerm(random));
    }
    return [...queries];
}

/**
 * Why the formatter dropped a report the exact window offered. `reasonForReportToBeInOptionList` hides an empty
 * chat thread, which is the one rejection this dataset triggers; anything else comes back as its raw shape so a
 * new leak names itself in the failure.
 */
function classifyReportDrop(reportID: string): string {
    const report: Report | undefined = dataset.reports[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
    const isArchived = !!dataset.privateIsArchivedMap[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`];
    // With no cached report attributes in the store, `isEmptyReport` is this function.
    if (isChatThread(report) && generateIsEmptyReport(report, isArchived)) {
        return EMPTY_CHAT_THREAD;
    }
    return `${reportID} type=${report?.type ?? 'none'} chatType=${report?.chatType ?? 'none'} parent=${report?.parentReportID ?? 'none'} archived=${isArchived}`;
}

/**
 * The candidates the formatter skipped: everything the engine offered ahead of the last row it did render.
 * Candidates past that point are the tail the render limit cut, not rows a predicate dropped.
 */
function findSkipped(candidateIDs: string[], rendered: Set<string>): string[] {
    const lastRenderedIndex = candidateIDs.findLastIndex((id) => rendered.has(id));
    return candidateIDs.slice(0, lastRenderedIndex + 1).filter((id) => !rendered.has(id));
}

/** The one query-time exclusion the contact branch still applies, over the logins of the reports it just showed. */
function classifyContactDrop(accountID: string, shownLogins: Set<string>): string {
    const login = dataset.personalDetails[Number(accountID)]?.login;
    if (login && shownLogins.has(login)) {
        return SHOWN_AS_RECENT_REPORT;
    }
    return `contact ${accountID} login=${login ?? 'none'}`;
}

/** Whether the rendered rows keep the order the engine gave them, which is the sort the formatter repeats. */
function findReorderings(candidateIDs: string[], renderedIDs: string[]): string[] {
    const rendered = new Set(renderedIDs);
    const inEngineOrder = candidateIDs.filter((id) => rendered.has(id));
    return inEngineOrder.length === renderedIDs.length && inEngineOrder.every((id, index) => id === renderedIDs.at(index)) ? [] : [ORDER_DIFFERS];
}

async function collectDropReasons(query: string): Promise<string[]> {
    const underflowsBefore = getSearchOptionsIndexStats().underflows;
    requestSearchOptions(query, formatConfig);
    await waitForBatchedUpdates();
    // A refill runs on the wider window, so the snapshot needs one more turn before it carries this query.
    await waitForBatchedUpdates();
    const hasRefilled = getSearchOptionsIndexStats().underflows > underflowsBefore;
    const window = getSearchWindow(formatConfig, hasRefilled ? REFILL_FACTOR : 1);
    const options = getSearchOptionsIndexSnapshot()?.options;
    const renderedReports = new Set(options?.recentReports.map((option) => option.reportID));
    const renderedContacts = new Set(options?.personalDetails.map((option) => String(option.accountID)));
    const shownLogins = new Set((options?.recentReports ?? []).map((option) => option.login).filter((login): login is string => !!login));
    const engineWindow = await searchMockEngine({version: 0, terms: processSearchString(query), reportLimit: window.reportLimit, contactLimit: window.contactLimit});
    return [
        ...findSkipped(engineWindow.reportIDs, renderedReports).map(classifyReportDrop),
        ...findSkipped(engineWindow.contactIDs, renderedContacts).map((accountID) => classifyContactDrop(accountID, shownLogins)),
        ...findReorderings(engineWindow.reportIDs, options?.recentReports.map((option) => option.reportID) ?? []),
        ...findReorderings(engineWindow.contactIDs, options?.personalDetails.map((option) => String(option.accountID)) ?? []),
    ];
}

describe('SearchOptionsIndex exact window', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        await Onyx.merge(ONYXKEYS.SESSION, {accountID: CURRENT_USER_ACCOUNT_ID, email: CURRENT_USER_EMAIL});
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, dataset.personalDetails);
        await waitForBatchedUpdates();
        resetMockEngine();
        resetSearchOptionsIndexStore();
        setSearchRouterEngineMode('sql-like');
        feedSearchOptionsIndex(toSearchOptionsIndexInputs(dataset));
    });

    afterAll(async () => {
        setSearchRouterEngineMode('sql-fts');
        await Onyx.clear();
    });

    it(`renders the engine window in the engine order over ${QUERY_COUNT} random queries, bar one predicate`, async () => {
        const reasons: string[] = [];
        for (const query of buildQueries(QUERY_COUNT)) {
            // The queries run one after another because each one reads the counters the previous one moved.
            reasons.push(...(await collectDropReasons(query)));
        }
        const stats = getSearchOptionsIndexStats();

        expect([...new Set(reasons)]).toEqual([EMPTY_CHAT_THREAD]);
        expect(stats.searches).toBe(QUERY_COUNT + stats.underflows);
        expect(stats.underflows).toBeLessThanOrEqual(MAX_UNDERFLOWS);
    });
});

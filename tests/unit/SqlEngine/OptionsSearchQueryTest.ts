import matchOptionIndexRows from '@libs/SearchOptionsIndex/matchOptionIndexRows';
import {createOptionsSchema, FTS_MIN_TERM_LENGTH, ingestOptionRows, readOptionRowCount, searchOptionRows} from '@libs/SqlEngine/wasm/optionsTable';
import type {IngestOptionsRequest, OptionIndexRow, OptionsMatcher, SearchOptionsRequest} from '@libs/SqlEngine/wasm/protocol';
import type {WasmSqlEngine} from '@libs/SqlEngine/wasm/WasmSqlDriver';
import createWasmSqlEngine from '@libs/SqlEngine/wasm/WasmSqlDriver';

const MATCHERS: OptionsMatcher[] = ['like', 'fts'];
const LIMIT = 5;

function report(id: string, searchText: string, orderKey: string, isHidden = false): OptionIndexRow {
    return {kind: 'report', id, searchText, orderKey, isHidden};
}

function contact(id: string, searchText: string): OptionIndexRow {
    return {kind: 'contact', id, searchText, orderKey: searchText.split(' ').at(0) ?? '', isHidden: false};
}

/** Rows covering substring hits, a hidden match, LIKE and FTS special characters, a self-DM key and short terms. */
const FIXTURE: OptionIndexRow[] = [
    report('1', 'zephyr team 1 me@example.com', '0_1_2024-03-01'),
    report('2', 'chat 2', '0_1_2024-03-02'),
    report('3', 'zephyr group 3 anna zephyrson', '0_1_2024-03-03'),
    report('4', 'hidden zephyr 4', '0_1_2024-03-04', true),
    report('5', 'zephyr archived 5', '0_0_2024-03-05'),
    report('6', 'self dm zephyr 6', '1_1_2024-01-01'),
    report('7', '100% "quoted" under_score zephyr', '0_1_2024-03-07'),
    report('8', 'zephyr tie', '0_1_2024-03-08'),
    report('9', 'zephyr nine', '0_1_2024-03-09'),
    report('10', 'ze 10', '0_1_2024-03-10'),
    report('11', 'zephyr eleven', '0_1_2024-03-11'),
    contact('101', 'zephyr person zephyr@example.com zephyr@examplecom'),
    contact('102', 'person two two@example.com'),
    contact('103', 'anna zephyrson anna@example.com'),
    contact('104', 'ze short'),
];

const QUERIES: string[][] = [['zephyr'], ['zep'], ['ze'], ['zephyr', 'nine'], ['zephyr', 'an'], ['%'], ['_score'], ['"quoted"'], ['zephyr@examplecom'], ['nomatch'], []];

function ingestRequest(overrides: Partial<IngestOptionsRequest>): IngestOptionsRequest {
    return {type: 'ingest-options', requestID: 1, version: 1, upserts: [], deletes: [], full: false, ...overrides};
}

function searchRequest(terms: string[]): SearchOptionsRequest {
    return {type: 'search-options', requestID: 2, version: 1, terms, reportLimit: LIMIT, contactLimit: LIMIT};
}

describe.each(MATCHERS)('option_rows search with the %s matcher', (matcher) => {
    let engine: WasmSqlEngine;

    beforeEach(async () => {
        engine = await createWasmSqlEngine('memory');
        await createOptionsSchema(engine.driver, matcher);
        await ingestOptionRows(engine.driver, ingestRequest({upserts: FIXTURE, full: true}));
    });

    it.each(QUERIES)('returns the same window as the JS matcher for %j', async (...terms) => {
        const expected = matchOptionIndexRows(FIXTURE, terms, LIMIT, LIMIT);
        const result = await searchOptionRows(engine.driver, searchRequest(terms), matcher);

        expect(result.reportIDs).toEqual(expected.reportIDs);
        expect(result.contactIDs).toEqual(expected.accountIDs);
        expect(result.hasMoreReports).toBe(expected.hasMoreReports);
        expect(result.hasMoreContacts).toBe(expected.hasMoreContacts);
    });

    it('applies upserts and deletes on top of the full ingest', async () => {
        await ingestOptionRows(
            engine.driver,
            ingestRequest({
                version: 2,
                upserts: [report('2', 'chat 2 became zephyr', '0_1_2024-12-31'), report('12', 'brand new zephyr', '0_1_2024-03-12')],
                deletes: [
                    {kind: 'report', id: '11'},
                    {kind: 'contact', id: '101'},
                ],
            }),
        );

        const result = await searchOptionRows(engine.driver, searchRequest(['zephyr']), matcher);
        expect(result.reportIDs).toEqual(['6', '2', '12', '9', '8']);
        expect(result.contactIDs).toEqual(['103']);
        expect(await readOptionRowCount(engine.driver)).toBe(FIXTURE.length - 1);
    });

    it('breaks an order_key tie on the id so two clients see the same window edge', async () => {
        await ingestOptionRows(engine.driver, ingestRequest({version: 2, upserts: [report('20', 'tie zephyr', '0_1_2024-03-08'), report('21', 'tie zephyr', '0_1_2024-03-08')]}));
        const result = await searchOptionRows(engine.driver, searchRequest(['tie']), matcher);
        // Row 8 shares the key; string ids compare, so '8' sorts above '21' and '20'.
        expect(result.reportIDs).toEqual(['8', '21', '20']);
    });

    it('never reads a hidden row', async () => {
        const result = await searchOptionRows(engine.driver, searchRequest(['hidden']), matcher);
        expect(result.reportIDs).toEqual([]);
    });
});

describe('FTS_MIN_TERM_LENGTH', () => {
    it('is the trigram floor, so two-character terms cannot be routed to MATCH', () => {
        expect(FTS_MIN_TERM_LENGTH).toBe(3);
    });
});

import matchOptionIndexRows from '@libs/SearchOptionsIndex/matchOptionIndexRows';
import type {SqlDriver, SqlValue} from '@libs/SqlEngine/SqlDriver';
import type {OptionsSearchPlan} from '@libs/SqlEngine/wasm/optionsSearchPlan';
import {buildOptionsSearchPlan, DRIVER_DOC_CAP, SHORT_TERM_TRIGRAM_CAP} from '@libs/SqlEngine/wasm/optionsSearchPlan';
import {buildSearchStatement, createOptionsSchema, FTS_MIN_TERM_LENGTH, ingestOptionRows, readOptionRowCount, searchOptionRows} from '@libs/SqlEngine/wasm/optionsTable';
import type {IngestOptionsRequest, OptionIndexKind, OptionIndexRow, SearchOptionsRequest} from '@libs/SqlEngine/wasm/protocol';
import type {WasmSqlEngine} from '@libs/SqlEngine/wasm/WasmSqlDriver';
import createWasmSqlEngine from '@libs/SqlEngine/wasm/WasmSqlDriver';

const KINDS: OptionIndexKind[] = ['report', 'contact'];
const LIMIT = 5;

/** The plan of one prepared window query, as one string so a test can look for what must and must not be in it. */
async function explainQueryPlan(driver: SqlDriver, statement: {sql: string; params: SqlValue[]}): Promise<string> {
    const rows = await driver.execute(`EXPLAIN QUERY PLAN ${statement.sql}`, statement.params);
    return rows.map((row) => String(row.detail)).join(' | ');
}

/** The FTS triggers the bulk rebuild drops and recreates, so a test can prove the incremental path is intact. */
async function readTriggerNames(driver: SqlDriver): Promise<string[]> {
    const rows = await driver.execute("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name;");
    return rows.map((row) => String(row.name));
}

function report(id: string, searchText: string, orderKey: string, isHidden = false, isValid = true): OptionIndexRow {
    return {kind: 'report', id, searchText, orderKey, isHidden, isValid};
}

function contact(id: string, searchText: string, isValid = true): OptionIndexRow {
    return {kind: 'contact', id, searchText, orderKey: searchText.split(' ').at(0) ?? '', isHidden: false, isValid};
}

const SCAN_PLAN: OptionsSearchPlan = {type: 'scan'};

/** Rows covering substring hits, a hidden match, an invalid match, LIKE and FTS special characters, a self-DM key and short terms. */
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
    report('13', 'invalid zephyr notifications', '0_1_2024-03-13', false, false),
    // The short term sits inside a word and at the very end of the text, the two cases a word-prefix index misses.
    report('14', 'quarterly re14 budget qr', '0_1_2024-03-14'),
    contact('101', 'zephyr person zephyr@example.com zephyr@examplecom'),
    contact('102', 'person two two@example.com'),
    contact('103', 'anna zephyrson anna@example.com'),
    contact('104', 'ze short'),
    contact('105', 'zephyr invalid contact', false),
];

const QUERIES: string[][] = [
    ['zephyr'],
    ['zep'],
    ['ze'],
    ['zephyr', 'nine'],
    ['zephyr', 'an'],
    ['%'],
    ['_score'],
    ['"quoted"'],
    ['zephyr@examplecom'],
    ['nomatch'],
    [],
    ['qr'],
    ['r1'],
    ['e1'],
    ['z'],
    ['zq'],
    ['zephyr', 'zq'],
    ['qr', 'budget'],
];

function ingestRequest(overrides: Partial<IngestOptionsRequest>): IngestOptionsRequest {
    return {type: 'ingest-options', requestID: 1, version: 1, upserts: [], deletes: [], full: false, ...overrides};
}

function searchRequest(terms: string[]): SearchOptionsRequest {
    return {type: 'search-options', requestID: 2, version: 1, terms, reportLimit: LIMIT, contactLimit: LIMIT};
}

describe('option_rows search', () => {
    let engine: WasmSqlEngine;

    beforeEach(async () => {
        engine = await createWasmSqlEngine('memory');
        await createOptionsSchema(engine.driver);
        await ingestOptionRows(engine.driver, ingestRequest({upserts: FIXTURE, full: true}));
    });

    it.each(QUERIES)('returns the same window as the JS matcher for %j', async (...terms) => {
        const expected = matchOptionIndexRows(FIXTURE, terms, LIMIT, LIMIT);
        const result = await searchOptionRows(engine.driver, searchRequest(terms));

        expect(result.reportIDs).toEqual(expected.reportIDs);
        expect(result.contactIDs).toEqual(expected.accountIDs);
        expect(result.matchedReports).toBe(expected.matchedReports);
        expect(result.matchedContacts).toBe(expected.matchedContacts);
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

        const result = await searchOptionRows(engine.driver, searchRequest(['zephyr']));
        expect(result.reportIDs).toEqual(['6', '2', '12', '9', '8']);
        expect(result.contactIDs).toEqual(['103']);
        expect(await readOptionRowCount(engine.driver)).toBe(FIXTURE.length - 1);
    });

    it('breaks an order_key tie on the id so two clients see the same window edge', async () => {
        await ingestOptionRows(engine.driver, ingestRequest({version: 2, upserts: [report('20', 'tie zephyr', '0_1_2024-03-08'), report('21', 'tie zephyr', '0_1_2024-03-08')]}));
        const result = await searchOptionRows(engine.driver, searchRequest(['tie']));
        // Row 8 shares the key; string ids compare, so '8' sorts above '21' and '20'.
        expect(result.reportIDs).toEqual(['8', '21', '20']);
    });

    it('never reads a hidden row', async () => {
        const result = await searchOptionRows(engine.driver, searchRequest(['hidden']));
        expect(result.reportIDs).toEqual([]);
    });

    it('never reads a row the validity column rejected', async () => {
        const result = await searchOptionRows(engine.driver, searchRequest(['invalid']));
        expect(result.reportIDs).toEqual([]);
        expect(result.contactIDs).toEqual([]);
    });
});

describe('option_rows query plans', () => {
    let engine: WasmSqlEngine;

    beforeEach(async () => {
        engine = await createWasmSqlEngine('memory');
        await createOptionsSchema(engine.driver);
        await ingestOptionRows(engine.driver, ingestRequest({upserts: FIXTURE, full: true}));
    });

    it.each(QUERIES)('walks the order index for %j without a temp b-tree', async (...terms) => {
        for (const kind of KINDS) {
            const statement = buildSearchStatement(terms, kind, LIMIT, SCAN_PLAN);
            const plan = await explainQueryPlan(engine.driver, statement);
            expect(plan).not.toContain('TEMP B-TREE');
            expect(plan).toContain('INDEX option_rows_order');
        }
    });
});

describe('option_rows search plans', () => {
    let engine: WasmSqlEngine;

    beforeEach(async () => {
        engine = await createWasmSqlEngine('memory');
        await createOptionsSchema(engine.driver);
        await ingestOptionRows(engine.driver, ingestRequest({upserts: FIXTURE, full: true}));
    });

    it('drives the join from the term itself and reaches the rows by primary key', async () => {
        const plan = await buildOptionsSearchPlan(engine.driver, ['zephyr', 'nine']);
        expect(plan).toEqual({type: 'driver', match: '"zephyr"', exactTerm: 'zephyr'});

        for (const kind of KINDS) {
            const statement = buildSearchStatement(['zephyr', 'nine'], kind, LIMIT, plan);
            const queryPlan = await explainQueryPlan(engine.driver, statement);
            expect(queryPlan).toContain('SCAN f VIRTUAL TABLE');
            expect(queryPlan).toContain('SEARCH o USING INTEGER PRIMARY KEY');
            // The kind, is_hidden and is_valid predicates ride on the primary key lookup, so no row of the
            // order index is read; the only sort is over the rows the driver matched, which the cap bounds.
            expect(queryPlan).not.toContain('SCAN option_rows');
        }
    });

    it('drives the join from the trigrams a short term starts, so it never scans for one', async () => {
        const plan = await buildOptionsSearchPlan(engine.driver, ['qr']);
        expect(plan).toEqual({type: 'driver', match: '"qr "', exactTerm: ''});

        const statement = buildSearchStatement(['qr'], 'report', LIMIT, plan);
        const queryPlan = await explainQueryPlan(engine.driver, statement);
        expect(queryPlan).toContain('SCAN f VIRTUAL TABLE');
        expect(queryPlan).toContain('SEARCH o USING INTEGER PRIMARY KEY');
    });

    it('keeps the LIKE predicate of every term the driver does not prove', async () => {
        const plan = await buildOptionsSearchPlan(engine.driver, ['zephyr', 'nine']);
        const statement = buildSearchStatement(['zephyr', 'nine'], 'report', LIMIT, plan);
        expect(statement.sql.match(/LIKE \?/g)).toHaveLength(1);
        expect(statement.params).toContain('%nine%');
    });

    it('proves an empty result from the vocabulary without building a statement', async () => {
        expect(await buildOptionsSearchPlan(engine.driver, ['zq'])).toEqual({type: 'empty'});
        expect(await buildOptionsSearchPlan(engine.driver, ['nomatch'])).toEqual({type: 'empty'});
        expect(await buildOptionsSearchPlan(engine.driver, ['zephyr', 'zq'])).toEqual({type: 'empty'});
    });

    it('leaves an empty term list on the ordered index walk', async () => {
        expect(await buildOptionsSearchPlan(engine.driver, [])).toEqual(SCAN_PLAN);
    });

    it('falls back to the ordered index walk once a term is too dense to drive the join', async () => {
        const dense = Array.from({length: DRIVER_DOC_CAP + 1}, (value, index) => report(`5${index}`, `dense filler ${index}`, `0_1_2024-04-01 ${index}`));
        await ingestOptionRows(engine.driver, ingestRequest({version: 2, upserts: dense}));

        expect(await buildOptionsSearchPlan(engine.driver, ['dense'])).toEqual(SCAN_PLAN);
        // The trigram the short term starts now has more documents than the cap allows.
        expect(await buildOptionsSearchPlan(engine.driver, ['en'])).toEqual(SCAN_PLAN);

        const result = await searchOptionRows(engine.driver, searchRequest(['dense', '1000']));
        expect(result.reportIDs).toEqual(['51000']);
    });

    it('leaves the index searchable after a bulk rebuild, and the triggers back in place for the next upsert', async () => {
        await ingestOptionRows(engine.driver, ingestRequest({version: 2, upserts: FIXTURE, full: true}));
        expect(await readTriggerNames(engine.driver)).toEqual(['option_rows_ad', 'option_rows_ai', 'option_rows_au']);

        await ingestOptionRows(
            engine.driver,
            ingestRequest({
                version: 3,
                upserts: [report('2', 'chat 2 became zephyr', '0_1_2024-12-31')],
                deletes: [
                    {kind: 'report', id: '9'},
                    {kind: 'contact', id: '101'},
                ],
            }),
        );

        expect((await searchOptionRows(engine.driver, searchRequest(['zephyr']))).reportIDs).toEqual(['6', '2', '11', '8', '7']);
        // The deleted rows left the FTS index too, so their own words no longer match.
        expect(await searchOptionRows(engine.driver, searchRequest(['nine']))).toMatchObject({reportIDs: [], contactIDs: []});
        expect(await searchOptionRows(engine.driver, searchRequest(['zephyr@examplecom']))).toMatchObject({contactIDs: []});
        expect(await readOptionRowCount(engine.driver)).toBe(FIXTURE.length - 2);
    });

    it('caps how many trigrams a short term may start', () => {
        expect(SHORT_TERM_TRIGRAM_CAP).toBeLessThan(DRIVER_DOC_CAP);
    });
});

describe('FTS_MIN_TERM_LENGTH', () => {
    it('is the trigram floor, so two-character terms cannot be routed to MATCH', () => {
        expect(FTS_MIN_TERM_LENGTH).toBe(3);
    });
});

import type {SqlDriver, SqlValue} from '@libs/SqlEngine/SqlDriver';

import type {OptionsMatcher} from './protocol';

/** The trigram tokenizer indexes nothing shorter than three characters, so shorter terms are probed by trigram prefix. */
const FTS_MIN_TERM_LENGTH = 3;

/** A term matching fewer documents than this drives the FTS join; above it the ordered index walk stops sooner. */
const DRIVER_DOC_CAP = 2000;

/** Above this many trigrams sharing a short term as their prefix the OR expression costs more than the index walk. */
const SHORT_TERM_TRIGRAM_CAP = 8;

/** The largest code point, so a term followed by it sorts above every trigram that starts with that term. */
const ABOVE_EVERY_TRIGRAM = String.fromCodePoint(0x10ffff);

const TRIGRAM_DOC_COUNT = 'SELECT doc AS probe FROM option_vocab WHERE term = ?;';

const TRIGRAMS_WITH_PREFIX = 'SELECT term FROM option_vocab WHERE term >= ? AND term < ? LIMIT ?;';

const BOUNDED_MATCH_COUNT = 'SELECT COUNT(*) AS probe FROM (SELECT rowid FROM option_fts WHERE option_fts MATCH ? LIMIT ?);';

/**
 * How the window query should read the index. `empty` means the vocabulary proved that no row can match, so no
 * query runs at all; `driver` names the MATCH expression selective enough to drive the FTS join; `scan` means
 * every term is dense and the ordered index walk with its LIMIT is cheaper than reading the matching rows.
 */
type OptionsSearchPlan = {type: 'empty'} | {type: 'scan'} | {type: 'driver'; match: string; exactTerm: string};

function toFtsPhrase(term: string): string {
    return `"${term.replaceAll('"', '""')}"`;
}

async function readProbe(driver: SqlDriver, sql: string, params: SqlValue[]): Promise<number> {
    const value = (await driver.execute(sql, params)).at(0)?.probe;
    return typeof value === 'number' ? value : 0;
}

/** Every trigram of the index that starts with a short term, one more than the cap so a dense term is recognized. */
async function readTrigramsWithPrefix(driver: SqlDriver, prefix: string): Promise<string[]> {
    const rows = await driver.execute(TRIGRAMS_WITH_PREFIX, [prefix, `${prefix}${ABOVE_EVERY_TRIGRAM}`, SHORT_TERM_TRIGRAM_CAP + 1]);
    return rows.map((row) => row.term).filter((term): term is string => typeof term === 'string');
}

/**
 * The MATCH expression of a short term, or nothing when the term spreads over too many trigrams to bound.
 * `undefined` means the term matches nothing at all, which settles the whole query.
 */
async function readShortTermMatch(driver: SqlDriver, term: string): Promise<string | undefined> {
    const trigrams = await readTrigramsWithPrefix(driver, term);
    if (trigrams.length === 0) {
        return undefined;
    }
    return trigrams.length > SHORT_TERM_TRIGRAM_CAP ? '' : trigrams.map(toFtsPhrase).join(' OR ');
}

/**
 * Probes the FTS vocabulary before the window query is built. Short terms come first because their probe is the
 * cheapest proof of an empty result; long terms are then probed by the document count of their first trigram and
 * the first one under the cap drives the join. The LIKE predicates stay on every other term, so the driver
 * decides only the cost of the query, never its result.
 */
async function buildOptionsSearchPlan(driver: SqlDriver, matcher: OptionsMatcher, terms: string[]): Promise<OptionsSearchPlan> {
    if (matcher !== 'fts' || terms.length === 0) {
        return {type: 'scan'};
    }
    const shortMatches: string[] = [];
    for (const term of terms.filter((value) => value.length < FTS_MIN_TERM_LENGTH)) {
        // Sequential on purpose: each probe can settle the query, and the driver runs one statement at a time.
        // eslint-disable-next-line no-await-in-loop
        const match = await readShortTermMatch(driver, term);
        if (match === undefined) {
            return {type: 'empty'};
        }
        if (match !== '') {
            shortMatches.push(match);
        }
    }
    for (const term of terms.filter((value) => value.length >= FTS_MIN_TERM_LENGTH)) {
        // eslint-disable-next-line no-await-in-loop
        const docs = await readProbe(driver, TRIGRAM_DOC_COUNT, [term.slice(0, FTS_MIN_TERM_LENGTH)]);
        if (docs === 0) {
            return {type: 'empty'};
        }
        if (docs < DRIVER_DOC_CAP) {
            return {type: 'driver', match: toFtsPhrase(term), exactTerm: term};
        }
    }
    const shortMatch = shortMatches.at(0);
    if (shortMatch === undefined) {
        return {type: 'scan'};
    }
    const matched = await readProbe(driver, BOUNDED_MATCH_COUNT, [shortMatch, DRIVER_DOC_CAP]);
    return matched < DRIVER_DOC_CAP ? {type: 'driver', match: shortMatch, exactTerm: ''} : {type: 'scan'};
}

export {buildOptionsSearchPlan, FTS_MIN_TERM_LENGTH, DRIVER_DOC_CAP, SHORT_TERM_TRIGRAM_CAP};
export type {OptionsSearchPlan};

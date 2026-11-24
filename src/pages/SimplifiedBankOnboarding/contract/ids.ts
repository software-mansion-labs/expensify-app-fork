/**
 * The IDs that a URL can name: a step is the `page` param of a flow route and a page is its `subPage` param. They are
 * closed unions of the constants, so a route param is checked once and then trusted as a typed ID.
 */
import type {ValueOf} from 'type-fest';

import SBO_CONST from './SBO_CONST';

/** The one step of the invited director flow. Its value equals the NonUSD signer step, whose pages it shares. */
const ENTER_SIGNER_INFO_STEP_ID = 'signer-info';

type USDStepID = ValueOf<typeof SBO_CONST.USD.PAGE_NAMES>;
type NonUSDStepID = ValueOf<typeof SBO_CONST.NON_USD.PAGE_NAMES>;
type StepID = USDStepID | NonUSDStepID | typeof ENTER_SIGNER_INFO_STEP_ID;

/** The values of every `*_SUB_PAGES` group of one constant group */
type SubPageIDsOf<TGroup> = {
    [TKey in keyof TGroup]: TKey extends `${string}_SUB_PAGES` ? (TGroup[TKey] extends Record<string, string> ? ValueOf<TGroup[TKey]> : never) : never;
}[keyof TGroup];

/** Every `*_SUB_PAGES` value of both flows and of the invited director page */
type PageID = SubPageIDsOf<typeof SBO_CONST.USD> | SubPageIDsOf<typeof SBO_CONST.NON_USD> | ValueOf<typeof SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES>;

function isStringRecord(value: unknown): value is Record<string, string> {
    return typeof value === 'object' && value !== null && Object.values(value).every((item: unknown) => typeof item === 'string');
}

function getSubPageIDs(group: Record<string, unknown>): string[] {
    return Object.entries(group).flatMap(([key, value]) => (key.endsWith('_SUB_PAGES') && isStringRecord(value) ? Object.values(value) : []));
}

const STEP_IDS = new Set<string>([...Object.values(SBO_CONST.USD.PAGE_NAMES), ...Object.values(SBO_CONST.NON_USD.PAGE_NAMES), ENTER_SIGNER_INFO_STEP_ID]);
const PAGE_IDS = new Set<string>([...getSubPageIDs(SBO_CONST.USD), ...getSubPageIDs(SBO_CONST.NON_USD), ...Object.values(SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES)]);

function isStepID(value: string | undefined): value is StepID {
    return value !== undefined && STEP_IDS.has(value);
}

function isPageID(value: string | undefined): value is PageID {
    return value !== undefined && PAGE_IDS.has(value);
}

export {ENTER_SIGNER_INFO_STEP_ID, isPageID, isStepID};
export type {NonUSDStepID, PageID, StepID, USDStepID};

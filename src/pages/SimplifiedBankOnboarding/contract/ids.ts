/**
 * The IDs that a URL can name: a step is a page name of a flow and a page is a sub-page of a step. They are closed
 * unions of the constants, so a plan cannot point at a page that does not exist and a URL is checked before the flow
 * trusts it.
 */
import type {ValueOf} from 'type-fest';

import SBO_CONST from './SBO_CONST';

type SubPageIDs<TGroup> = {
    [TKey in keyof TGroup]: TKey extends `${string}_SUB_PAGES` ? (TGroup[TKey] extends Record<string, string> ? ValueOf<TGroup[TKey]> : never) : never;
}[keyof TGroup];

/** The URL `page` value of a step */
type StepID = ValueOf<typeof SBO_CONST.USD.PAGE_NAMES> | ValueOf<typeof SBO_CONST.NON_USD.PAGE_NAMES>;

/** The URL `subPage` value of a page */
type PageID = SubPageIDs<typeof SBO_CONST.USD> | SubPageIDs<typeof SBO_CONST.NON_USD> | ValueOf<typeof SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES>;

function isStringRecord(value: unknown): value is Record<string, string> {
    return typeof value === 'object' && value !== null && Object.values(value).every((item: unknown) => typeof item === 'string');
}

function getSubPageIDs(group: Record<string, unknown>): string[] {
    return Object.entries(group).flatMap(([key, value]) => (key.endsWith('_SUB_PAGES') && isStringRecord(value) ? Object.values(value) : []));
}

const STEP_IDS = new Set<string>([...Object.values(SBO_CONST.USD.PAGE_NAMES), ...Object.values(SBO_CONST.NON_USD.PAGE_NAMES)]);
const PAGE_IDS = new Set<string>([...getSubPageIDs(SBO_CONST.USD), ...getSubPageIDs(SBO_CONST.NON_USD), ...Object.values(SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES)]);

function isStepID(value: string): value is StepID {
    return STEP_IDS.has(value);
}

function isPageID(value: string): value is PageID {
    return PAGE_IDS.has(value);
}

export {isPageID, isStepID};
export type {PageID, StepID};

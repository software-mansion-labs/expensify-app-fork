/**
 * The IDs that a URL can name: a step is the `page` param of a flow route and a page is its `subPage` param. The steps
 * are a closed union of the constants, so a route param is checked once and then trusted as a typed ID. The pages belong
 * to the step that renders them, so only that step knows whether the URL names one of its pages.
 */
import type {ValueOf} from 'type-fest';

import SBO_CONST from './SBO_CONST';

/** The one step of the invited director flow. It is the NonUSD signer step, whose pages it shares. */
const ENTER_SIGNER_INFO_STEP_ID = SBO_CONST.NON_USD.PAGE_NAMES.SIGNER_INFO;

type USDStepID = ValueOf<typeof SBO_CONST.USD.PAGE_NAMES>;
type NonUSDStepID = ValueOf<typeof SBO_CONST.NON_USD.PAGE_NAMES>;
type StepID = USDStepID | NonUSDStepID;

/** The `subPage` param of a flow route. Each step declares the names of its own pages, so any text can be one. */
type PageID = string;

const STEP_IDS = new Set<string>([...Object.values(SBO_CONST.USD.PAGE_NAMES), ...Object.values(SBO_CONST.NON_USD.PAGE_NAMES)]);

function isStepID(value: string | undefined): value is StepID {
    return value !== undefined && STEP_IDS.has(value);
}

export {ENTER_SIGNER_INFO_STEP_ID, isStepID};
export type {NonUSDStepID, PageID, StepID, USDStepID};

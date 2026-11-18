/**
 * The order of the pages of the non-USD bank account setup, and which pages an account skips.
 * The route holds the current page, so the flow page resolves a snapshot from the route and asks for the transition. The machine is not run as an actor.
 */
import CONST from '@src/CONST';

import {setup} from 'xstate';

const PAGE = CONST.NON_USD_BANK_ACCOUNT.PAGE_NAME;

/** The end of the flow at both of its edges, which goes one screen back */
const NON_USD_BANK_ACCOUNT_FLOW_STEPPED_OUT = 'steppedOut';

type NonUSDBankAccountFlowContext = {
    /** The account's currency asks for a signed form, so the Docusign page is shown */
    isDocusignStepRequired: boolean;
};

const nonUSDBankAccountFlowMachine = setup({
    // `{} as T` is how XState v5 takes types. The values are never read.
    /* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
    types: {
        context: {} as NonUSDBankAccountFlowContext,
        input: {} as NonUSDBankAccountFlowContext,
        events: {} as {type: 'NEXT'} | {type: 'BACK'},
    },
    /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */
    guards: {
        isDocusignStepRequired: ({context}) => context.isDocusignStepRequired,
    },
}).createMachine({
    id: 'nonUSDBankAccountFlow',
    context: ({input}) => input,
    initial: PAGE.CURRENCY_AND_COUNTRY,
    states: {
        [PAGE.CURRENCY_AND_COUNTRY]: {on: {NEXT: PAGE.BANK_INFO, BACK: NON_USD_BANK_ACCOUNT_FLOW_STEPPED_OUT}},
        [PAGE.BANK_INFO]: {on: {NEXT: PAGE.BUSINESS_INFO, BACK: PAGE.CURRENCY_AND_COUNTRY}},
        [PAGE.BUSINESS_INFO]: {on: {NEXT: PAGE.BENEFICIAL_OWNER_INFO, BACK: PAGE.BANK_INFO}},
        [PAGE.BENEFICIAL_OWNER_INFO]: {on: {NEXT: PAGE.SIGNER_INFO, BACK: PAGE.BUSINESS_INFO}},
        [PAGE.SIGNER_INFO]: {on: {NEXT: PAGE.AGREEMENTS, BACK: PAGE.BENEFICIAL_OWNER_INFO}},
        [PAGE.AGREEMENTS]: {on: {NEXT: [{guard: 'isDocusignStepRequired', target: PAGE.DOCUSIGN}, {target: PAGE.FINISH}], BACK: PAGE.SIGNER_INFO}},
        [PAGE.DOCUSIGN]: {on: {NEXT: PAGE.FINISH, BACK: PAGE.AGREEMENTS}},
        [PAGE.FINISH]: {on: {NEXT: NON_USD_BANK_ACCOUNT_FLOW_STEPPED_OUT, BACK: [{guard: 'isDocusignStepRequired', target: PAGE.DOCUSIGN}, {target: PAGE.AGREEMENTS}]}},
        [NON_USD_BANK_ACCOUNT_FLOW_STEPPED_OUT]: {type: 'final'},
    },
});

export default nonUSDBankAccountFlowMachine;
export {NON_USD_BANK_ACCOUNT_FLOW_STEPPED_OUT};

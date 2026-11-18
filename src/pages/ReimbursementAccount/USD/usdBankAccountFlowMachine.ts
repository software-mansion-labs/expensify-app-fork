/**
 * The order of the pages of the USD bank account setup, and which pages an account skips.
 * The route holds the current page, so the flow page resolves a snapshot from the route and asks for the transition. The machine is not run as an actor.
 */
import CONST from '@src/CONST';

import {setup} from 'xstate';

const PAGE = CONST.BANK_ACCOUNT.PAGE_NAMES;

/** Where the flow ends: `STEPPED_OUT` goes one screen back, `CLOSED` leaves the whole setup */
const USD_BANK_ACCOUNT_FLOW_END = {
    STEPPED_OUT: 'steppedOut',
    CLOSED: 'closed',
} as const;

type USDBankAccountFlowContext = {
    /** The identity check is done, so its page is skipped */
    isOnfidoSetupComplete: boolean;

    /** The verification checks ask for company documents, so their page is shown */
    isKYBDocumentsRequired: boolean;

    /** The account is submitted and waits for validation, so the setup pages behind it can no longer be changed */
    isPendingValidation: boolean;
};

const usdBankAccountFlowMachine = setup({
    // `{} as T` is how XState v5 takes types. The values are never read.
    /* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
    types: {
        context: {} as USDBankAccountFlowContext,
        input: {} as USDBankAccountFlowContext,
        events: {} as {type: 'NEXT'} | {type: 'BACK'},
    },
    /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */
    guards: {
        isOnfidoSetupComplete: ({context}) => context.isOnfidoSetupComplete,
        isKYBDocumentsRequired: ({context}) => context.isKYBDocumentsRequired,
        isPendingValidation: ({context}) => context.isPendingValidation,
    },
}).createMachine({
    id: 'usdBankAccountFlow',
    context: ({input}) => input,
    initial: PAGE.COUNTRY,
    states: {
        [PAGE.COUNTRY]: {on: {NEXT: PAGE.BANK_ACCOUNT, BACK: USD_BANK_ACCOUNT_FLOW_END.STEPPED_OUT}},
        [PAGE.BANK_ACCOUNT]: {on: {NEXT: PAGE.REQUESTOR, BACK: PAGE.COUNTRY}},
        [PAGE.REQUESTOR]: {on: {NEXT: [{guard: 'isOnfidoSetupComplete', target: PAGE.COMPANY}, {target: PAGE.VERIFY_IDENTITY}], BACK: PAGE.BANK_ACCOUNT}},
        [PAGE.VERIFY_IDENTITY]: {on: {NEXT: PAGE.COMPANY, BACK: PAGE.REQUESTOR}},
        [PAGE.COMPANY]: {on: {NEXT: PAGE.BENEFICIAL_OWNERS, BACK: [{guard: 'isOnfidoSetupComplete', target: PAGE.REQUESTOR}, {target: PAGE.VERIFY_IDENTITY}]}},
        [PAGE.BENEFICIAL_OWNERS]: {on: {NEXT: PAGE.ACH_CONTRACT, BACK: PAGE.COMPANY}},
        [PAGE.ACH_CONTRACT]: {on: {NEXT: [{guard: 'isKYBDocumentsRequired', target: PAGE.KYB_DOCS}, {target: PAGE.VALIDATION}], BACK: PAGE.BENEFICIAL_OWNERS}},
        [PAGE.KYB_DOCS]: {on: {NEXT: PAGE.VALIDATION, BACK: PAGE.ACH_CONTRACT}},
        [PAGE.VALIDATION]: {
            on: {
                NEXT: USD_BANK_ACCOUNT_FLOW_END.STEPPED_OUT,
                BACK: [
                    // The entry page sends a pending account straight back to validation, so stepping out to it would trap the user in a loop
                    {guard: 'isPendingValidation', target: USD_BANK_ACCOUNT_FLOW_END.CLOSED},
                    {guard: 'isKYBDocumentsRequired', target: PAGE.KYB_DOCS},
                    {target: PAGE.ACH_CONTRACT},
                ],
            },
        },
        [USD_BANK_ACCOUNT_FLOW_END.STEPPED_OUT]: {type: 'final'},
        [USD_BANK_ACCOUNT_FLOW_END.CLOSED]: {type: 'final'},
    },
});

export default usdBankAccountFlowMachine;
export {USD_BANK_ACCOUNT_FLOW_END};

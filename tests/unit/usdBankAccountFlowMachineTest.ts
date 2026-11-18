import usdBankAccountFlowMachine, {USD_BANK_ACCOUNT_FLOW_END} from '@pages/ReimbursementAccount/USD/usdBankAccountFlowMachine';

import CONST from '@src/CONST';

import type {ContextFrom} from 'xstate';

import {transition} from 'xstate';

const PAGE = CONST.BANK_ACCOUNT.PAGE_NAMES;

type Context = ContextFrom<typeof usdBankAccountFlowMachine>;

const NEW_ACCOUNT: Context = {isOnfidoSetupComplete: false, isKYBDocumentsRequired: false, isPendingValidation: false};

function getTarget(page: string, eventType: 'NEXT' | 'BACK', context: Context = NEW_ACCOUNT) {
    const snapshot = usdBankAccountFlowMachine.resolveState({value: page, context});
    return transition(usdBankAccountFlowMachine, snapshot, {type: eventType})[0].value;
}

describe('usdBankAccountFlowMachine', () => {
    it('shows the identity check until Onfido is done, in both directions', () => {
        // Given an account that has not passed the identity check, and one that has
        const verified: Context = {...NEW_ACCOUNT, isOnfidoSetupComplete: true};

        // When the user moves between the personal info and the company pages
        // Then only the verified account skips the identity check, since Onfido cannot be run twice
        expect(getTarget(PAGE.REQUESTOR, 'NEXT')).toBe(PAGE.VERIFY_IDENTITY);
        expect(getTarget(PAGE.COMPANY, 'BACK')).toBe(PAGE.VERIFY_IDENTITY);
        expect(getTarget(PAGE.REQUESTOR, 'NEXT', verified)).toBe(PAGE.COMPANY);
        expect(getTarget(PAGE.COMPANY, 'BACK', verified)).toBe(PAGE.REQUESTOR);
    });

    it('shows the company documents page only when documents are asked for', () => {
        // Given an account whose verification checks ask for company documents, and one whose checks do not
        const needsDocuments: Context = {...NEW_ACCOUNT, isKYBDocumentsRequired: true};

        // When the user moves between the agreements and the validation pages
        // Then the documents page sits between them only for the account that needs it
        expect(getTarget(PAGE.ACH_CONTRACT, 'NEXT')).toBe(PAGE.VALIDATION);
        expect(getTarget(PAGE.VALIDATION, 'BACK')).toBe(PAGE.ACH_CONTRACT);
        expect(getTarget(PAGE.ACH_CONTRACT, 'NEXT', needsDocuments)).toBe(PAGE.KYB_DOCS);
        expect(getTarget(PAGE.VALIDATION, 'BACK', needsDocuments)).toBe(PAGE.KYB_DOCS);
    });

    it('ends at both edges of the flow', () => {
        // Given the first and the last page of the flow
        // When the user steps out of either edge
        // Then the flow steps out, and a pending account closes the setup, since its entry page would send it back to validation
        expect(getTarget(PAGE.COUNTRY, 'BACK')).toBe(USD_BANK_ACCOUNT_FLOW_END.STEPPED_OUT);
        expect(getTarget(PAGE.VALIDATION, 'NEXT')).toBe(USD_BANK_ACCOUNT_FLOW_END.STEPPED_OUT);
        expect(getTarget(PAGE.VALIDATION, 'BACK', {...NEW_ACCOUNT, isPendingValidation: true})).toBe(USD_BANK_ACCOUNT_FLOW_END.CLOSED);
    });
});

import nonUSDBankAccountFlowMachine, {NON_USD_BANK_ACCOUNT_FLOW_STEPPED_OUT} from '@pages/ReimbursementAccount/NonUSD/nonUSDBankAccountFlowMachine';

import CONST from '@src/CONST';

import type {ContextFrom} from 'xstate';

import {transition} from 'xstate';

const PAGE = CONST.NON_USD_BANK_ACCOUNT.PAGE_NAME;

type Context = ContextFrom<typeof nonUSDBankAccountFlowMachine>;

const NO_DOCUSIGN: Context = {isDocusignStepRequired: false};

function getTarget(page: string, eventType: 'NEXT' | 'BACK', context: Context = NO_DOCUSIGN) {
    const snapshot = nonUSDBankAccountFlowMachine.resolveState({value: page, context});
    return transition(nonUSDBankAccountFlowMachine, snapshot, {type: eventType})[0].value;
}

describe('nonUSDBankAccountFlowMachine', () => {
    it('shows the Docusign page only when the currency asks for a signed form', () => {
        // Given an account whose currency asks for a signed form, and one whose currency does not
        const needsDocusign: Context = {isDocusignStepRequired: true};

        // When the user moves between the agreements and the finish pages
        // Then the Docusign page sits between them only for the account that needs it
        expect(getTarget(PAGE.AGREEMENTS, 'NEXT')).toBe(PAGE.FINISH);
        expect(getTarget(PAGE.FINISH, 'BACK')).toBe(PAGE.AGREEMENTS);
        expect(getTarget(PAGE.AGREEMENTS, 'NEXT', needsDocusign)).toBe(PAGE.DOCUSIGN);
        expect(getTarget(PAGE.FINISH, 'BACK', needsDocusign)).toBe(PAGE.DOCUSIGN);
    });

    it('steps out at both edges of the flow', () => {
        // Given the first and the last page of the flow
        // When the user steps out of either edge
        // Then the flow ends, so the page goes one screen back instead of to another setup page
        expect(getTarget(PAGE.CURRENCY_AND_COUNTRY, 'BACK')).toBe(NON_USD_BANK_ACCOUNT_FLOW_STEPPED_OUT);
        expect(getTarget(PAGE.FINISH, 'NEXT')).toBe(NON_USD_BANK_ACCOUNT_FLOW_STEPPED_OUT);
    });
});

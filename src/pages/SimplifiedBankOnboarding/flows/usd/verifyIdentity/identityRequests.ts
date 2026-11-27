/**
 * The requests of the USD identity check: the read that stores the token of the fake Onfido widget, and the write of
 * the check result.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

const identityCheckFlowRead: OnboardingRequest = {
    name: 'usd.verifyIdentity.openCheck',
    build: ({bankAccount}) => (bankAccount.policyID ? {type: 'read', command: READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW, params: {policyID: bankAccount.policyID}} : undefined),
};

/** The input is the result of the widget */
const verifyIdentityRequest: OnboardingRequest<string> = {
    name: 'usd.verifyIdentity.verify',
    build: ({bankAccount}, onfidoData) => ({
        type: 'write',
        command: WRITE_COMMANDS.VERIFY_IDENTITY,
        params: {...bankAccount, onfidoData},
        ...getUSDWriteOptions(),
    }),
};

export {identityCheckFlowRead, verifyIdentityRequest};

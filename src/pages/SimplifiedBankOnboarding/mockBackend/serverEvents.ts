/**
 * Things that happen on the server without a request from the client: a reviewer finishing the review of a bank account,
 * or somebody changing a setting. The real backend tells the client about them with a push, so these functions also
 * write the result straight to Onyx.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- The mock server mirrors its state into Onyx the way a server response would */
/* eslint-disable no-param-reassign -- The mock server keeps its database in memory and the handlers change it in place */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import type {MockServerSettings, ReviewOutcome} from './types';

import {buildAccountUpdates} from './handlers/buildResponse';
import {changeDatabase} from './serverDatabase';

const {STATE, MOCK} = SBO_CONST;

function finishReview(policyID: string, outcome: ReviewOutcome) {
    const updates = changeDatabase((database) => {
        const account = database.bankAccounts[policyID];
        if (account?.state !== STATE.VERIFYING) {
            return [];
        }
        if (outcome === MOCK.REVIEW_OUTCOME.OPEN) {
            account.state = STATE.OPEN;
            account.currentStep = account.currentStep ? SBO_CONST.USD.STEP.ENABLE : undefined;
        } else {
            account.state = STATE.PENDING;
        }
        return buildAccountUpdates(database, policyID);
    });
    Onyx.update(updates);
}

function setUserValidated(validated: boolean) {
    changeDatabase((database) => {
        database.user.validated = validated;
    });
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {validated});
}

function updateServerSettings(settings: Partial<MockServerSettings>) {
    changeDatabase((database) => {
        Object.assign(database.settings, settings);
    });
}

export {finishReview, setUserValidated, updateServerSettings};

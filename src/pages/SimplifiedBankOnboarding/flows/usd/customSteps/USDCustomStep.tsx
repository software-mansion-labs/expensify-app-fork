/**
 * Picks the screen of a custom page of the USD flow. Each screen gets only the props it uses, so a screen cannot reach
 * a callback it has no business calling.
 */
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import React from 'react';

import OnfidoStep from './OnfidoStep';
import PlaidStep from './PlaidStep';
import ValidationStep from './validation/ValidationStep';

function USDCustomStep({page, policyID, isSubmitting, errorText, onComplete, goToStep}: CustomStepProps) {
    switch (page.component) {
        case 'plaid':
            return (
                <PlaidStep
                    bankAccountsRequest={page.request}
                    canComplete={page.canComplete ?? true}
                    isSubmitting={isSubmitting}
                    errorText={errorText}
                    onComplete={onComplete}
                />
            );
        case 'onfido':
            return (
                <OnfidoStep
                    isSubmitting={isSubmitting}
                    errorText={errorText}
                    onComplete={onComplete}
                />
            );
        case 'validation':
            return (
                <ValidationStep
                    validateRequest={page.request}
                    policyID={policyID}
                    onComplete={onComplete}
                    goToStep={goToStep}
                />
            );
        default:
            return null;
    }
}

export default USDCustomStep;

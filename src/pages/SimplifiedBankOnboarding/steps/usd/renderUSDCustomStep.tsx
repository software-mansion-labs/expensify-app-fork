/**
 * Picks the screen of a custom page of the USD flow. Each screen gets only the props it uses, so a screen cannot reach
 * a callback it has no business calling.
 */
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/controller/types';

import React from 'react';

import OnfidoStep from './OnfidoStep';
import PlaidStep from './PlaidStep';
import ValidationStep from './validation/ValidationStep';

function renderUSDCustomStep({page, policyID, isSubmitting, errorText, onComplete, goToStep}: CustomStepProps) {
    switch (page.component) {
        case 'plaid':
            return (
                <PlaidStep
                    isSubmitting={isSubmitting}
                    errorText={errorText}
                    onComplete={onComplete}
                />
            );
        case 'onfido':
            return (
                <OnfidoStep
                    policyID={policyID}
                    isSubmitting={isSubmitting}
                    errorText={errorText}
                    onComplete={onComplete}
                />
            );
        case 'validation':
            return (
                <ValidationStep
                    policyID={policyID}
                    isSubmitting={isSubmitting}
                    errorText={errorText}
                    onComplete={onComplete}
                    goToStep={goToStep}
                />
            );
        default:
            return null;
    }
}

export default renderUSDCustomStep;

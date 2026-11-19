/**
 * Picks the screen of a custom page of the NonUSD flow. Each screen gets only the props it uses, and this component
 * hands a screen the navigation it may ask for, so no screen navigates itself.
 */
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/controller/types';
import {openEnterSignerInfo} from '@pages/SimplifiedBankOnboarding/navigation/flowNavigation';

import React from 'react';

import FinishStep from './FinishStep';
import HangTightStep from './HangTightStep';

function NonUSDCustomStep({page, policyID, onComplete}: CustomStepProps) {
    switch (page.component) {
        case 'hangTight':
            return (
                <HangTightStep
                    policyID={policyID}
                    canContinue={page.canComplete ?? true}
                    openSignerForm={openEnterSignerInfo}
                    onComplete={onComplete}
                />
            );
        case 'finish':
            return (
                <FinishStep
                    policyID={policyID}
                    onComplete={onComplete}
                />
            );
        default:
            return null;
    }
}

export default NonUSDCustomStep;

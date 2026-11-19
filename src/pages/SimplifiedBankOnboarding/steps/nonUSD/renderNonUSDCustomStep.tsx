/**
 * Picks the screen of a custom page of the NonUSD flow. Each screen gets only the props it uses, and the flow passes in
 * the navigation that a screen may ask for, so no screen navigates itself.
 */
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/controller/types';

import React from 'react';

import FinishStep from './FinishStep';
import HangTightStep from './HangTightStep';

type NonUSDCustomStepProps = CustomStepProps & {
    openSignerForm: (policyID: string | undefined, bankAccountID: number | undefined) => void;
};

function renderNonUSDCustomStep({page, policyID, onComplete, openSignerForm}: NonUSDCustomStepProps) {
    switch (page.component) {
        case 'hangTight':
            return (
                <HangTightStep
                    policyID={policyID}
                    canContinue={page.canComplete ?? true}
                    openSignerForm={openSignerForm}
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

export default renderNonUSDCustomStep;

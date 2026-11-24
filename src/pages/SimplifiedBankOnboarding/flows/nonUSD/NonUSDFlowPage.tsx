/**
 * The screen of the NonUSD flow: its steps in flow order. The docusign step appears only for a currency that needs the
 * signed authorization form, and the finish step has no number. The server stores no step for this flow, so each step
 * says from the saved data whether it is complete, and without a step in the URL the flow opens the first step that is
 * not. Together the rules mirror `getStartPageForContinueSetup` of the real flow.
 */
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/contract/currency';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {isGlobalAccountCreated, isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {FlowStep, OnboardingFlow, useFlowDataOf} from '@pages/SimplifiedBankOnboarding/core';
import type {FlowTarget} from '@pages/SimplifiedBankOnboarding/core';

import type SCREENS from '@src/SCREENS';

import React from 'react';

import AgreementsStep from './agreements/AgreementsStep';
import areAgreementsComplete from './agreements/areAgreementsComplete';
import BankInfoStep from './bankInfo/BankInfoStep';
import areOwnersComplete from './beneficialOwners/areOwnersComplete';
import BeneficialOwnersStep from './beneficialOwners/BeneficialOwnersStep';
import BusinessInfoStep from './businessInfo/BusinessInfoStep';
import isBusinessInfoComplete from './businessInfo/isBusinessInfoComplete';
import CountryStep from './country/CountryStep';
import isCountryComplete from './country/isCountryComplete';
import DocusignStep from './docusign/DocusignStep';
import FinishStep from './finish/FinishStep';
import {isSignerStepComplete} from './signer/signerRules';
import SignerStep from './signer/SignerStep';

type NonUSDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

const {PAGE_NAMES} = SBO_CONST.NON_USD;

function NonUSDFlowPage({route}: NonUSDFlowPageProps) {
    const target: FlowTarget = {kind: 'nonUSD', policyID: route.params?.policyID, backTo: route.params?.backTo};
    const data = useFlowDataOf(target);
    const achData = data.account?.achData;

    return (
        <OnboardingFlow
            target={target}
            params={route.params}
        >
            <FlowStep
                id={PAGE_NAMES.COUNTRY}
                component={CountryStep}
                isComplete={isCountryComplete(data)}
            />
            <FlowStep
                id={PAGE_NAMES.BANK_INFO}
                component={BankInfoStep}
                isComplete={isGlobalAccountCreated(achData)}
            />
            <FlowStep
                id={PAGE_NAMES.BUSINESS_INFO}
                component={BusinessInfoStep}
                isComplete={isBusinessInfoComplete(data)}
            />
            <FlowStep
                id={PAGE_NAMES.BENEFICIAL_OWNER_INFO}
                component={BeneficialOwnersStep}
                isComplete={areOwnersComplete(data)}
            />
            <FlowStep
                id={PAGE_NAMES.SIGNER_INFO}
                component={SignerStep}
                isComplete={isSignerStepComplete(data)}
            />
            <FlowStep
                id={PAGE_NAMES.AGREEMENTS}
                component={AgreementsStep}
                isComplete={areAgreementsComplete(data)}
            />
            <FlowStep
                id={PAGE_NAMES.DOCUSIGN}
                component={DocusignStep}
                isComplete={isVerifying(achData)}
                skip={!requiresDocusignStep(data.currency)}
            />
            <FlowStep
                id={PAGE_NAMES.FINISH}
                component={FinishStep}
                isComplete={false}
                counter="none"
            />
        </OnboardingFlow>
    );
}

export default NonUSDFlowPage;

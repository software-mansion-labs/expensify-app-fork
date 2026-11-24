/**
 * The screen of the USD flow: its steps in flow order. The identity check shares the number of personal info and is
 * skipped once the server finished it. The document step has no number and appears only when the verification asks for
 * documents. Without a step in the URL the flow opens the step that the server stored.
 */
import useOnyx from '@hooks/useOnyx';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {FlowStep, OnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';

import React from 'react';

import BankAccountStep from './bankAccount/BankAccountStep';
import BeneficialOwnersStep from './beneficialOwners/BeneficialOwnersStep';
import BusinessInfoStep from './businessInfo/BusinessInfoStep';
import CompleteVerificationStep from './completeVerification/CompleteVerificationStep';
import CountryStep from './country/CountryStep';
import getUSDResumeStep from './getUSDResumeStep';
import KYBDocumentsStep from './kybDocuments/KYBDocumentsStep';
import PersonalInfoStep from './personalInfo/PersonalInfoStep';
import ValidationStep from './validation/ValidationStep';
import VerifyIdentityStep from './verifyIdentity/VerifyIdentityStep';

type USDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;

const {PAGE_NAMES} = SBO_CONST.USD;

function USDFlowPage({route}: USDFlowPageProps) {
    const [achData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => account?.achData});

    return (
        <OnboardingFlow
            target={{kind: 'usd', policyID: route.params?.policyID, backTo: route.params?.backTo}}
            params={route.params}
            resumeAt={getUSDResumeStep(achData)}
        >
            <FlowStep
                id={PAGE_NAMES.COUNTRY}
                component={CountryStep}
            />
            <FlowStep
                id={PAGE_NAMES.BANK_ACCOUNT}
                component={BankAccountStep}
            />
            <FlowStep
                id={PAGE_NAMES.REQUESTOR}
                component={PersonalInfoStep}
            />
            <FlowStep
                id={PAGE_NAMES.VERIFY_IDENTITY}
                component={VerifyIdentityStep}
                skip={!!achData?.isOnfidoSetupComplete}
                counter="shared"
            />
            <FlowStep
                id={PAGE_NAMES.COMPANY}
                component={BusinessInfoStep}
            />
            <FlowStep
                id={PAGE_NAMES.BENEFICIAL_OWNERS}
                component={BeneficialOwnersStep}
            />
            <FlowStep
                id={PAGE_NAMES.ACH_CONTRACT}
                component={CompleteVerificationStep}
            />
            <FlowStep
                id={PAGE_NAMES.KYB_DOCS}
                component={KYBDocumentsStep}
                skip={!achData?.requiredKYBDocuments?.length}
                counter="none"
            />
            <FlowStep
                id={PAGE_NAMES.VALIDATION}
                component={ValidationStep}
            />
        </OnboardingFlow>
    );
}

export default USDFlowPage;

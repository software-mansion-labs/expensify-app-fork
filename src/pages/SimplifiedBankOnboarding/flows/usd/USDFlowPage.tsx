/**
 * The screen of the USD flow: its steps in flow order. The identity check shares the number of personal info and is
 * skipped once the server finished it. The document step has no number and appears only when the verification asks for
 * documents. A step is complete once the server stored a later one, so without a step in the URL the flow opens the
 * step that the server stored. The server step of the identity check is the one of personal info.
 *
 * Every rule of this flow reads only `achData`, so the page selects it and does not render again when the draft changes.
 */
import useOnyx from '@hooks/useOnyx';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {FlowStep, OnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';
import type {FlowTarget} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';

import React from 'react';

import BankAccountStep from './bankAccount/BankAccountStep';
import BeneficialOwnersStep from './beneficialOwners/BeneficialOwnersStep';
import BusinessInfoStep from './businessInfo/BusinessInfoStep';
import CompleteVerificationStep from './completeVerification/CompleteVerificationStep';
import CountryStep from './country/CountryStep';
import isPastServerStep from './isPastServerStep';
import KYBDocumentsStep from './kybDocuments/KYBDocumentsStep';
import PersonalInfoStep from './personalInfo/PersonalInfoStep';
import ValidationStep from './validation/ValidationStep';
import VerifyIdentityStep from './verifyIdentity/VerifyIdentityStep';

type USDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;

const {PAGE_NAMES, STEP} = SBO_CONST.USD;

function USDFlowPage({route}: USDFlowPageProps) {
    const target: FlowTarget = {kind: 'usd', policyID: route.params?.policyID, backTo: route.params?.backTo};
    const [achData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => account?.achData});

    return (
        <OnboardingFlow
            target={target}
            params={route.params}
        >
            <FlowStep
                id={PAGE_NAMES.COUNTRY}
                component={CountryStep}
                isComplete={isPastServerStep(achData, STEP.COUNTRY)}
            />
            <FlowStep
                id={PAGE_NAMES.BANK_ACCOUNT}
                component={BankAccountStep}
                isComplete={isPastServerStep(achData, STEP.BANK_ACCOUNT)}
            />
            <FlowStep
                id={PAGE_NAMES.REQUESTOR}
                component={PersonalInfoStep}
                isComplete={isPastServerStep(achData, STEP.REQUESTOR)}
            />
            <FlowStep
                id={PAGE_NAMES.VERIFY_IDENTITY}
                component={VerifyIdentityStep}
                isComplete={isPastServerStep(achData, STEP.REQUESTOR)}
                skip={!!achData?.isOnfidoSetupComplete}
                counter="shared"
            />
            <FlowStep
                id={PAGE_NAMES.COMPANY}
                component={BusinessInfoStep}
                isComplete={isPastServerStep(achData, STEP.COMPANY)}
            />
            <FlowStep
                id={PAGE_NAMES.BENEFICIAL_OWNERS}
                component={BeneficialOwnersStep}
                isComplete={isPastServerStep(achData, STEP.BENEFICIAL_OWNERS)}
            />
            <FlowStep
                id={PAGE_NAMES.ACH_CONTRACT}
                component={CompleteVerificationStep}
                isComplete={isPastServerStep(achData, STEP.ACH_CONTRACT)}
            />
            <FlowStep
                id={PAGE_NAMES.KYB_DOCS}
                component={KYBDocumentsStep}
                isComplete={isPastServerStep(achData, STEP.KYB_DOCS)}
                skip={!achData?.requiredKYBDocuments?.length}
                counter="none"
            />
            <FlowStep
                id={PAGE_NAMES.VALIDATION}
                component={ValidationStep}
                isComplete={false}
            />
        </OnboardingFlow>
    );
}

export default USDFlowPage;

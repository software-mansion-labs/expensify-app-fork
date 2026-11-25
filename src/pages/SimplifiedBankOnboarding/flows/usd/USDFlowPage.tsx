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
                isComplete={isPastServerStep(achData, STEP.COUNTRY)}
            >
                <CountryStep />
            </FlowStep>
            <FlowStep
                id={PAGE_NAMES.BANK_ACCOUNT}
                isComplete={isPastServerStep(achData, STEP.BANK_ACCOUNT)}
            >
                <BankAccountStep />
            </FlowStep>
            <FlowStep
                id={PAGE_NAMES.REQUESTOR}
                isComplete={isPastServerStep(achData, STEP.REQUESTOR)}
            >
                <PersonalInfoStep />
            </FlowStep>
            <FlowStep
                id={PAGE_NAMES.VERIFY_IDENTITY}
                isComplete={isPastServerStep(achData, STEP.REQUESTOR)}
                skip={!!achData?.isOnfidoSetupComplete}
                counter="shared"
            >
                <VerifyIdentityStep />
            </FlowStep>
            <FlowStep
                id={PAGE_NAMES.COMPANY}
                isComplete={isPastServerStep(achData, STEP.COMPANY)}
            >
                <BusinessInfoStep />
            </FlowStep>
            <FlowStep
                id={PAGE_NAMES.BENEFICIAL_OWNERS}
                isComplete={isPastServerStep(achData, STEP.BENEFICIAL_OWNERS)}
            >
                <BeneficialOwnersStep />
            </FlowStep>
            <FlowStep
                id={PAGE_NAMES.ACH_CONTRACT}
                isComplete={isPastServerStep(achData, STEP.ACH_CONTRACT)}
            >
                <CompleteVerificationStep />
            </FlowStep>
            <FlowStep
                id={PAGE_NAMES.KYB_DOCS}
                isComplete={isPastServerStep(achData, STEP.KYB_DOCS)}
                skip={!achData?.requiredKYBDocuments?.length}
                counter="none"
            >
                <KYBDocumentsStep />
            </FlowStep>
            <FlowStep
                id={PAGE_NAMES.VALIDATION}
                isComplete={false}
            >
                <ValidationStep />
            </FlowStep>
        </OnboardingFlow>
    );
}

export default USDFlowPage;

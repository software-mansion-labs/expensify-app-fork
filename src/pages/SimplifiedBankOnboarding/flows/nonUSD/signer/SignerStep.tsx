/**
 * The signer step of the NonUSD flow. The user says whether they are a director. A director gives their details, and
 * every director who is not the user is invited by email, after which the step waits for them. The step starts at the
 * waiting page once the server holds the invitations it needs.
 */
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {requiresSecondDirector} from '@pages/SimplifiedBankOnboarding/contract/currency';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {NEXT_STEP, OnboardingStep, PREVIOUS_STEP, SubPage, YesNoSubPage, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import type {PageTarget} from '@pages/SimplifiedBankOnboarding/core';
import getBusinessInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/businessInfo/getBusinessInfoAnswers';
import renderSignerDetailsPages from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/renderSignerDetailsPages';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import getSignerAnswers from './getSignerAnswers';
import getSignerStartPage from './getSignerStartPage';
import HangTightPage from './HangTightPage';
import SignerEmailPage from './SignerEmailPage';
import {signerDetailsRequest} from './signerRequests';
import {getSignerEmailMode, getSignerFullName, shouldAskForSignerName} from './signerRules';

const PAGES = SBO_CONST.NON_USD.SIGNER_INFO_SUB_PAGES;

function SignerStep() {
    const {translate} = useLocalize();
    const data = useFlowData();
    const {currency} = data;
    const answers = getSignerAnswers(data);
    const {companyName} = getBusinessInfoAnswers(data);
    const [corpay] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => account?.achData?.corpay});

    const askForName = shouldAskForSignerName(data);

    const getDirectorAnswerPage = (isDirector: boolean): PageTarget => {
        if (!isDirector) {
            return PAGES.ENTER_EMAIL;
        }
        return askForName ? PAGES.NAME : PAGES.JOB_TITLE;
    };

    return (
        <OnboardingStep
            title={translate('signerInfoStep.signerInfo')}
            wrapperID="SimplifiedBankOnboardingSignerInfo"
            startAt={getSignerStartPage(corpay, currency)}
        >
            <YesNoSubPage
                name={PAGES.IS_DIRECTOR}
                inputID={INPUT_IDS.IS_USER_DIRECTOR}
                title={translate('signerInfoStep.areYouDirector', companyName)}
                description={translate('signerInfoStep.regulationRequiresUs')}
                defaultValue={answers.isUserDirector ?? false}
                getNext={getDirectorAnswerPage}
            />
            {renderSignerDetailsPages(translate, {
                askForName,
                values: {signerFullName: getSignerFullName(data), signerJobTitle: answers.signerJobTitle},
                request: signerDetailsRequest,
                next: requiresSecondDirector(currency) ? PAGES.ENTER_EMAIL : NEXT_STEP,
                firstPageBack: PAGES.IS_DIRECTOR,
            })}
            <SubPage
                name={PAGES.ENTER_EMAIL}
                back={answers.isUserDirector ? PAGES.CONFIRMATION : PAGES.IS_DIRECTOR}
                next={PAGES.HANG_TIGHT}
            >
                <SignerEmailPage
                    mode={getSignerEmailMode(answers.isUserDirector, currency)}
                    companyName={companyName}
                />
            </SubPage>
            <SubPage
                name={PAGES.HANG_TIGHT}
                back={PREVIOUS_STEP}
            >
                <HangTightPage currency={currency} />
            </SubPage>
        </OnboardingStep>
    );
}

export default SignerStep;

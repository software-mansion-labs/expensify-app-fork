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
import {NEXT_STEP, OnboardingStep, PREVIOUS_STEP, SubPage, YesNoSubPage} from '@pages/SimplifiedBankOnboarding/core';
import type {PageTarget} from '@pages/SimplifiedBankOnboarding/core';
import {useNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';
import renderSignerDetailsPages from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/renderSignerDetailsPages';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import getSignerStartPage from './getSignerStartPage';
import HangTightPage from './HangTightPage';
import SignerEmailPage from './SignerEmailPage';
import {signerDetailsRequest} from './signerRequests';
import {getSignerEmailMode, getSignerFullName, shouldAskForSignerName} from './signerRules';

const PAGES = SBO_CONST.NON_USD.SIGNER_INFO_SUB_PAGES;

function SignerStep() {
    const {translate} = useLocalize();
    const answers = useNonUSDAnswers();
    const [corpay] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => account?.achData?.corpay});

    const askForName = shouldAskForSignerName(answers);

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
            startAt={getSignerStartPage(corpay, answers.currency)}
        >
            <YesNoSubPage
                name={PAGES.IS_DIRECTOR}
                inputID={INPUT_IDS.IS_USER_DIRECTOR}
                title={translate('signerInfoStep.areYouDirector', answers.companyName)}
                description={translate('signerInfoStep.regulationRequiresUs')}
                defaultValue={answers.isUserDirector ?? false}
                getNext={getDirectorAnswerPage}
            />
            {renderSignerDetailsPages(translate, {
                askForName,
                values: {signerFullName: getSignerFullName(answers), signerJobTitle: answers.signerJobTitle},
                request: signerDetailsRequest,
                next: requiresSecondDirector(answers.currency) ? PAGES.ENTER_EMAIL : NEXT_STEP,
                firstPageBack: PAGES.IS_DIRECTOR,
            })}
            <SubPage
                name={PAGES.ENTER_EMAIL}
                back={answers.isUserDirector ? PAGES.CONFIRMATION : PAGES.IS_DIRECTOR}
                next={PAGES.HANG_TIGHT}
            >
                <SignerEmailPage
                    mode={getSignerEmailMode(answers.isUserDirector, answers.currency)}
                    companyName={answers.companyName}
                />
            </SubPage>
            <SubPage
                name={PAGES.HANG_TIGHT}
                back={PREVIOUS_STEP}
            >
                <HangTightPage currency={answers.currency} />
            </SubPage>
        </OnboardingStep>
    );
}

export default SignerStep;

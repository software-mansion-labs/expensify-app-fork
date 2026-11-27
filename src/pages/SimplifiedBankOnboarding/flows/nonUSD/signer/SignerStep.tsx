/**
 * The signer step of the NonUSD flow. The user says whether they are a director. A director gives their details, and
 * every director who is not the user is invited by email, after which the step waits for them. The step starts at the
 * waiting page once the server holds the invitations it needs.
 */
import useLocalize from '@hooks/useLocalize';

import {requiresSecondDirector} from '@pages/SimplifiedBankOnboarding/contract/currency';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import {NEXT_STEP, OnboardingStep, PREVIOUS_STEP, YesNoSubPage, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import type {PageTarget} from '@pages/SimplifiedBankOnboarding/core';
import getBusinessInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/businessInfo/getBusinessInfoAnswers';
import getSignerDetailsPages from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/getSignerDetailsPages';

import React from 'react';

import type {SignerPageName} from './signerPages';

import getSignerAnswers from './getSignerAnswers';
import getSignerStartPage from './getSignerStartPage';
import HangTightPage from './HangTightPage';
import SignerEmailPage from './SignerEmailPage';
import PAGES from './signerPages';
import {signerDetailsRequest} from './signerRequests';
import {getSignerEmailMode, getSignerFullName, shouldAskForSignerName} from './signerRules';

function SignerStep() {
    const {translate} = useLocalize();
    const data = useFlowData();
    const {currency} = data;
    const answers = getSignerAnswers(data);
    const {companyName} = getBusinessInfoAnswers(data);

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
            startAt={getSignerStartPage(data.account?.achData?.corpay, currency)}
            pages={[
                {
                    name: PAGES.IS_DIRECTOR,
                    content: (
                        <YesNoSubPage
                            inputID={INPUT_IDS.IS_USER_DIRECTOR}
                            title={translate('signerInfoStep.areYouDirector', companyName)}
                            description={translate('signerInfoStep.regulationRequiresUs')}
                            defaultValue={answers.isUserDirector ?? false}
                            getNext={getDirectorAnswerPage}
                        />
                    ),
                },
                ...getSignerDetailsPages<SignerPageName>(translate, {
                    askForName,
                    values: {signerFullName: getSignerFullName(data), signerJobTitle: answers.signerJobTitle},
                    request: signerDetailsRequest,
                    next: requiresSecondDirector(currency) ? PAGES.ENTER_EMAIL : NEXT_STEP,
                    firstPageBack: PAGES.IS_DIRECTOR,
                }),
                {
                    name: PAGES.ENTER_EMAIL,
                    back: answers.isUserDirector ? PAGES.CONFIRMATION : PAGES.IS_DIRECTOR,
                    next: PAGES.HANG_TIGHT,
                    content: (
                        <SignerEmailPage
                            mode={getSignerEmailMode(answers.isUserDirector, currency)}
                            companyName={companyName}
                        />
                    ),
                },
                {
                    name: PAGES.HANG_TIGHT,
                    back: PREVIOUS_STEP,
                    content: <HangTightPage currency={currency} />,
                },
            ]}
        />
    );
}

export default SignerStep;

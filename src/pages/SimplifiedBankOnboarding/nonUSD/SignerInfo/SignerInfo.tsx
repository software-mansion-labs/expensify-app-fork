/**
 * The signer step of the NonUSD flow. It mirrors `NonUSD/SignerInfo/index.tsx`: the sub page from the URL picks between
 * the form pages of a director, the director question, the emails of other directors and the waiting page. The answer to
 * the director question lives in the draft, the draft is seeded from the server data, and each of the two requests moves
 * the user to the next sub page once it succeeds. For a user who is also an owner, the step reads the
 * answer and the name that the owner step left in the draft, like the real step.
 */
import type {FormOnyxValues} from '@components/Form/types';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import YesNoStep from '@components/SubStepForms/YesNoStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import Navigation from '@libs/Navigation/Navigation';

import {askForSignerInformation, saveOnboardingDirectorInformation} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import {updateOnboardingDraft} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import getValuesForBeneficialOwner from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/utils/getValuesForBeneficialOwner';
import type NonUSDPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/types';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React, {useEffect} from 'react';

import EnterEmail from './EnterEmail';
import HangTight from './HangTight';
import SignerDetailsFormPages from './SignerDetailsFormPages';

const {PAGE_NAMES, SIGNER_INFO_SUB_PAGES: SUB_PAGE_NAMES, CURRENT_USER_KEY} = SBO_CONST.NON_USD;

function buildSignerInfoRoute(subPage: string, policyID: string | undefined, backTo: string | undefined) {
    return ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.SIGNER_INFO, subPage, backTo});
}

function SignerInfo({onBackButtonPress, onSubmit, policyID, currency = '', stepNames, startStepIndex, currentSubPage, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const corpay = account?.achData?.corpay;
    const companyName = corpay?.companyName ?? draft?.companyName ?? '';
    const isUserOwner = corpay?.ownsMoreThan25Percent ?? draft?.ownsMoreThan25Percent ?? false;
    const isUserDirector = draft?.isUserDirector ?? false;
    const isAUD = currency === SBO_CONST.CURRENCY.AUD;
    const shouldSendOnlySecondSignerEmail = isAUD && isUserDirector;

    const savedSignerFullName = corpay?.signerFullName;
    const savedSignerJobTitle = corpay?.signerJobTitle;
    const draftSignerFullName = draft?.signerFullName;

    const buildRoute = (subPage: string) => buildSignerInfoRoute(subPage, policyID, backTo);

    // An AUD workspace needs a second director, so a director who saved their data still has to invite one.
    const directorRequest = useStepRequest({onSuccess: isAUD ? () => Navigation.navigate(buildRoute(SUB_PAGE_NAMES.ENTER_EMAIL)) : onSubmit});
    const signerEmailRequest = useStepRequest({onSuccess: () => Navigation.navigate(buildRoute(SUB_PAGE_NAMES.HANG_TIGHT))});

    // Like the real step, a saved director means the user is the director, so the form pages open with the saved values.
    useEffect(() => {
        if (draftSignerFullName || !savedSignerFullName) {
            return;
        }
        updateOnboardingDraft({isUserDirector: true, signerFullName: savedSignerFullName, signerJobTitle: savedSignerJobTitle ?? ''});
    }, [draftSignerFullName, savedSignerFullName, savedSignerJobTitle]);

    const submit = () => {
        // The name page is skipped for an owner, so the name comes from the owner step: from its draft, or from what it saved when the draft is gone.
        const savedOwnerFullName = corpay?.beneficialOwners?.find((owner) => owner.uid === CURRENT_USER_KEY)?.fullName ?? '';
        const ownerFullName = getValuesForBeneficialOwner(CURRENT_USER_KEY, draft).fullName || savedOwnerFullName;
        const signerFullName = isUserOwner ? ownerFullName : (draft?.signerFullName ?? '');
        const directorInformation = {signerFullName, signerJobTitle: draft?.signerJobTitle ?? ''};
        directorRequest.send((requestID) => saveOnboardingDirectorInformation(requestID, getBankAccountParams(policyID, account?.achData), directorInformation));
    };

    const handleEmailSubmit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>) => {
        const bankAccountParams = getBankAccountParams(policyID, account?.achData);
        const signerEmails = shouldSendOnlySecondSignerEmail
            ? {secondSignerEmail: values.secondSignerEmail}
            : {signerEmail: values.signerEmail, secondSignerEmail: isAUD ? values.secondSignerEmail : undefined};
        signerEmailRequest.send((requestID) => askForSignerInformation(requestID, bankAccountParams, signerEmails));
    };

    const handleIsDirectorSelected = (isDirector: boolean) => {
        updateOnboardingDraft({isUserDirector: isDirector});
        if (!isDirector) {
            Navigation.navigate(buildRoute(SUB_PAGE_NAMES.ENTER_EMAIL));
            return;
        }
        Navigation.navigate(buildRoute(isUserOwner ? SUB_PAGE_NAMES.JOB_TITLE : SUB_PAGE_NAMES.NAME));
    };

    const handleBackButtonPress = () => {
        if (currentSubPage === SUB_PAGE_NAMES.ENTER_EMAIL) {
            clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
            Navigation.goBack(buildRoute(isUserDirector ? SUB_PAGE_NAMES.CONFIRMATION : SUB_PAGE_NAMES.IS_DIRECTOR));
            return;
        }
        onBackButtonPress();
    };

    const goBackToIsDirector = () => {
        Navigation.goBack(buildRoute(SUB_PAGE_NAMES.IS_DIRECTOR));
    };

    if (currentSubPage !== SUB_PAGE_NAMES.IS_DIRECTOR && currentSubPage !== SUB_PAGE_NAMES.ENTER_EMAIL && currentSubPage !== SUB_PAGE_NAMES.HANG_TIGHT) {
        return (
            <SignerDetailsFormPages
                onBackToIsDirector={goBackToIsDirector}
                onFinished={submit}
                stepNames={stepNames}
                startStepIndex={startStepIndex}
                policyID={policyID}
                backTo={backTo}
                isRequestPending={directorRequest.isPending}
                requestErrorMessage={directorRequest.errorMessage}
            />
        );
    }

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingSignerInfo"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('signerInfoStep.signerInfo')}
            stepNames={stepNames}
            startStepIndex={startStepIndex}
        >
            {currentSubPage === SUB_PAGE_NAMES.IS_DIRECTOR && (
                <YesNoStep
                    title={translate('signerInfoStep.areYouDirector', companyName)}
                    description={translate('signerInfoStep.regulationRequiresUs')}
                    defaultValue={isUserDirector}
                    onSelectedValue={handleIsDirectorSelected}
                />
            )}
            {currentSubPage === SUB_PAGE_NAMES.ENTER_EMAIL && (
                <EnterEmail
                    onSubmit={handleEmailSubmit}
                    isUserDirector={isUserDirector}
                    currency={currency}
                    companyName={companyName}
                    isLoading={signerEmailRequest.isPending}
                />
            )}
            {currentSubPage === SUB_PAGE_NAMES.HANG_TIGHT && (
                <HangTight
                    policyID={policyID}
                    currency={currency}
                    onContinue={onSubmit}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default SignerInfo;

/**
 * The beneficial owners step of the USD flow, a hand-written state machine like the real `BeneficialOwnersStep`. The
 * questions and the list are URL sub pages that this container renders itself, and any other sub page renders the
 * nested details form of one owner. The answers and the owners live in the draft, owner IDs are made on the client,
 * and only the last answer sends one request with every owner.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import YesNoStep from '@components/SubStepForms/YesNoStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import {updateBeneficialOwners} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type USDPageProps from '@pages/SimplifiedBankOnboarding/usd/types';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';
import {generateOwnerID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import {setDraftValues} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React, {useEffect} from 'react';

import BeneficialOwnerDetailsFormPages from './BeneficialOwnerDetailsFormPages';
import CompanyOwnersListUBO from './subSteps/CompanyOwnersListUBO';
import getValuesForBeneficialOwner from './utils/getValuesForBeneficialOwner';

const {PAGE_NAMES, BENEFICIAL_OWNERS_SUB_PAGES: SUB_PAGE_NAMES, MAX_NUMBER_OF_UBOS} = SBO_CONST.USD;

const OUTER_SUB_PAGES = new Set<string>([SUB_PAGE_NAMES.IS_USER_UBO, SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO, SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS, SUB_PAGE_NAMES.UBOS_LIST]);

function BeneficialOwners({onBackButtonPress, onSubmit, policyID, currentSubPage, stepNames, startStepIndex, backTo}: USDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const achData = account?.achData;
    const companyName = achData?.companyName ?? '';
    const {send, isPending, errorMessage} = useStepRequest({onSuccess: onSubmit});

    // The control state lives in the draft, because every sub page change is a navigation that remounts the step.
    // The draft wins over the server data, so an answer that the user changed is not replaced by the saved one.
    const isUserUBO = draft?.ownsMoreThan25Percent ?? achData?.ownsMoreThan25Percent ?? false;
    const isAnyoneElseUBO = (achData?.beneficialOwners?.length ?? 0) > 0 || (draft?.hasOtherBeneficialOwners ?? false);
    const beneficialOwnerKeys = draft?.beneficialOwnerKeys ?? achData?.beneficialOwnerKeys ?? [];
    const beneficialOwnerBeingModifiedID = draft?.ownerBeingModifiedID;
    const isEditingCreatedBeneficialOwner = draft?.isEditingCreatedOwner ?? false;
    const canAddMoreUBOs = beneficialOwnerKeys.length < (isUserUBO ? MAX_NUMBER_OF_UBOS - 1 : MAX_NUMBER_OF_UBOS);
    const hasCompletedStep = achData?.ownsMoreThan25Percent !== undefined;

    // The flow page opens this step without a sub page when the user comes back from the next step or resumes the setup.
    useEffect(() => {
        if (currentSubPage) {
            return;
        }

        let subPage: string = SUB_PAGE_NAMES.IS_USER_UBO;
        if (isUserUBO || (isAnyoneElseUBO && beneficialOwnerKeys.length > 0)) {
            subPage = SUB_PAGE_NAMES.UBOS_LIST;
        } else if (hasCompletedStep) {
            subPage = SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO;
        }
        Navigation.setParams({subPage});
    }, [currentSubPage, isUserUBO, isAnyoneElseUBO, beneficialOwnerKeys.length, hasCompletedStep]);

    const buildRoute = (subPage: string) => ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.BENEFICIAL_OWNERS, subPage, backTo});

    const navigateToSubPage = (subPage: string) => Navigation.navigate(buildRoute(subPage));

    const navigateBackToSubPage = (subPage: string) => Navigation.goBack(buildRoute(subPage));

    const submit = (ownerKeys: string[]) => {
        const beneficialOwners = ownerKeys.map((beneficialOwnerID) => getValuesForBeneficialOwner(beneficialOwnerID, draft));
        const beneficialOwnersInformation = {
            ownsMoreThan25Percent: isUserUBO,
            beneficialOwners: JSON.stringify(beneficialOwners),
            beneficialOwnerKeys: ownerKeys,
        };
        send((requestID) => updateBeneficialOwners(requestID, getBankAccountParams(policyID, achData), beneficialOwnersInformation));
    };

    const prepareBeneficialOwnerDetailsForm = () => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {ownerBeingModifiedID: generateOwnerID()});
        navigateToSubPage(SUB_PAGE_NAMES.LEGAL_NAME);
    };

    const handleBeneficialOwnerDetailsFormFinished = () => {
        const isNewBeneficialOwner = !!beneficialOwnerBeingModifiedID && !beneficialOwnerKeys.includes(beneficialOwnerBeingModifiedID);
        if (isNewBeneficialOwner && canAddMoreUBOs && beneficialOwnerBeingModifiedID) {
            setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {beneficialOwnerKeys: [...beneficialOwnerKeys, beneficialOwnerBeingModifiedID]});
        }

        // The keys are counted before the new owner is added, so this owner took the last free place.
        const isLastUBOThatCanBeAdded = beneficialOwnerKeys.length === (isUserUBO ? MAX_NUMBER_OF_UBOS - 2 : MAX_NUMBER_OF_UBOS - 1);
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {isEditingCreatedOwner: false});
        navigateToSubPage(isEditingCreatedBeneficialOwner || isLastUBOThatCanBeAdded ? SUB_PAGE_NAMES.UBOS_LIST : SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS);
    };

    const handleIsUserUBOSelected = (value: boolean) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {ownsMoreThan25Percent: value});

        // The user takes one of the places, so the last owner who no longer fits is dropped.
        if (value && beneficialOwnerKeys.length === MAX_NUMBER_OF_UBOS) {
            setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {beneficialOwnerKeys: beneficialOwnerKeys.slice(0, MAX_NUMBER_OF_UBOS - 1)});
        }
        navigateToSubPage(SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO);
    };

    const handleIsAnyoneElseUBOSelected = (value: boolean) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {hasOtherBeneficialOwners: value});

        if (value && canAddMoreUBOs) {
            prepareBeneficialOwnerDetailsForm();
            return;
        }
        if (!value && !isUserUBO) {
            submit([]);
            return;
        }
        navigateToSubPage(SUB_PAGE_NAMES.UBOS_LIST);
    };

    const handleAreThereMoreUBOsSelected = (value: boolean) => {
        if (value) {
            prepareBeneficialOwnerDetailsForm();
            return;
        }
        navigateToSubPage(SUB_PAGE_NAMES.UBOS_LIST);
    };

    const handleUBOEdit = (beneficialOwnerID: string) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {ownerBeingModifiedID: beneficialOwnerID, isEditingCreatedOwner: true});
        navigateToSubPage(SUB_PAGE_NAMES.LEGAL_NAME);
    };

    const handleBackButtonPress = () => {
        if (currentSubPage === SUB_PAGE_NAMES.IS_USER_UBO) {
            onBackButtonPress();
        } else if (currentSubPage === SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO) {
            navigateBackToSubPage(SUB_PAGE_NAMES.IS_USER_UBO);
        } else if (currentSubPage === SUB_PAGE_NAMES.UBOS_LIST && !canAddMoreUBOs) {
            navigateBackToSubPage(SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO);
        } else if (currentSubPage === SUB_PAGE_NAMES.UBOS_LIST && isAnyoneElseUBO) {
            navigateBackToSubPage(SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS);
        } else if (currentSubPage === SUB_PAGE_NAMES.UBOS_LIST && isUserUBO) {
            navigateBackToSubPage(SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO);
        } else {
            Navigation.goBack();
        }
    };

    const getQuestion = () => {
        if (currentSubPage === SUB_PAGE_NAMES.IS_USER_UBO) {
            return {title: translate('beneficialOwnerInfoStep.doYouOwn25percent', companyName), defaultValue: isUserUBO, onSelectedValue: handleIsUserUBOSelected};
        }
        if (currentSubPage === SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO) {
            return {title: translate('beneficialOwnerInfoStep.doAnyIndividualOwn25percent', companyName), defaultValue: isAnyoneElseUBO, onSelectedValue: handleIsAnyoneElseUBOSelected};
        }
        if (currentSubPage === SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS) {
            return {title: translate('beneficialOwnerInfoStep.areThereMoreIndividualsWhoOwn25percent', companyName), defaultValue: false, onSelectedValue: handleAreThereMoreUBOsSelected};
        }
        return undefined;
    };

    if (currentSubPage && !OUTER_SUB_PAGES.has(currentSubPage)) {
        return (
            <BeneficialOwnerDetailsFormPages
                policyID={policyID}
                beneficialOwnerBeingModifiedID={beneficialOwnerBeingModifiedID}
                isEditingCreatedBeneficialOwner={isEditingCreatedBeneficialOwner}
                onFinished={handleBeneficialOwnerDetailsFormFinished}
                stepNames={stepNames}
                startStepIndex={startStepIndex}
                backTo={backTo}
            />
        );
    }

    const question = getQuestion();

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingBeneficialOwners"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            headerTitle={translate('beneficialOwnerInfoStep.companyOwner')}
            handleBackButtonPress={handleBackButtonPress}
            startStepIndex={startStepIndex}
            stepNames={stepNames}
        >
            {!!question && (
                <YesNoStep
                    // Each question is its own form, so the selected answer must not carry over to the next one.
                    key={currentSubPage}
                    title={question.title}
                    description={translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity')}
                    submitButtonStyles={[styles.mb0]}
                    defaultValue={question.defaultValue}
                    onSelectedValue={question.onSelectedValue}
                    isLoading={isPending}
                />
            )}
            {currentSubPage === SUB_PAGE_NAMES.UBOS_LIST && (
                <CompanyOwnersListUBO
                    beneficialOwnerKeys={beneficialOwnerKeys}
                    isUserUBO={isUserUBO}
                    isAnyoneElseUBO={isAnyoneElseUBO}
                    onConfirm={() => submit(isAnyoneElseUBO ? beneficialOwnerKeys : [])}
                    onEdit={handleUBOEdit}
                    isRequestPending={isPending}
                    requestErrorMessage={errorMessage}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BeneficialOwners;

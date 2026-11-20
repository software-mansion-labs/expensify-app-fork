/**
 * The beneficial owners step of the USD flow. The questions and the list are URL sub pages that this container renders
 * itself, and any other sub page renders the nested details form of one owner. The transitions are the pure functions of
 * `uboLoop`. Each answer and each owner field is the draft value until the step is saved, then the saved one, and only
 * the last answer sends one request with every owner.
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
import {generateOwnerID, resolveOwnerKeys, resolveOwnerValues} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import type {OwnerLoopTransition} from '@pages/SimplifiedBankOnboarding/utils/owners/types';
import {getFieldsToClear, toForm, toParams, UBO_FIELDS} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBeneficialOwners';
import {PERSONAL_INFO_KEYS} from '@pages/SimplifiedBankOnboarding/values/codecs/usdPersonalInfo';
import {resolveValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import {setDraftValues} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React, {useEffect} from 'react';

import type {UBOLoopState, UBOQuestion, UBOSubPage} from './uboLoop';

import BeneficialOwnerDetailsFormPages from './BeneficialOwnerDetailsFormPages';
import CompanyOwnersListUBO from './subSteps/CompanyOwnersListUBO';
import {canAddMoreUBOs as getCanAddMoreUBOs, getNextUBOSubPage, getSubPageAfterUBODetails} from './uboLoop';

const {PAGE_NAMES, BENEFICIAL_OWNERS_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.USD;

// The real list reads the requestor from the server data only, so the draft is skipped on purpose.
const REQUESTOR_KEYS = {
    FIRST_NAME: PERSONAL_INFO_KEYS.FIRST_NAME,
    LAST_NAME: PERSONAL_INFO_KEYS.LAST_NAME,
    DOB: PERSONAL_INFO_KEYS.DOB,
};

const OUTER_SUB_PAGES = new Set<string>([SUB_PAGE_NAMES.IS_USER_UBO, SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO, SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS, SUB_PAGE_NAMES.UBOS_LIST]);

function BeneficialOwners({onBackButtonPress, onSubmit, policyID, currentSubPage, stepNames, startStepIndex, backTo}: USDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const achData = account?.achData;
    const companyName = achData?.companyName ?? '';
    const {send, isPending, errorMessage} = useStepRequest({onSuccess: onSubmit});

    // The loop state lives in the draft, because every sub page change is a navigation that remounts the step.
    // The draft wins over the server data, so an answer that the user changed is not replaced by the saved one.
    const savedOwners = toForm(achData);
    const isUserUBO = draft?.ownsMoreThan25Percent ?? achData?.ownsMoreThan25Percent ?? false;
    const isAnyoneElseUBO = draft?.hasOtherBeneficialOwners ?? (achData?.beneficialOwners?.length ?? 0) > 0;
    const beneficialOwnerKeys = resolveOwnerKeys(draft, savedOwners);
    const beneficialOwnerBeingModifiedID = draft?.ownerBeingModifiedID;
    const isEditingCreatedBeneficialOwner = draft?.isEditingCreatedOwner ?? false;
    const canAddMoreUBOs = getCanAddMoreUBOs(beneficialOwnerKeys, isUserUBO);
    const hasCompletedStep = achData?.ownsMoreThan25Percent !== undefined;
    const loopState: UBOLoopState = {ownerKeys: beneficialOwnerKeys, isUserUBO, ownerBeingModifiedID: beneficialOwnerBeingModifiedID, isEditingCreatedOwner: isEditingCreatedBeneficialOwner};

    const getOwnerValues = (ownerID: string) => resolveOwnerValues(draft, savedOwners, ownerID, UBO_FIELDS);

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
        const beneficialOwners = ownerKeys.map((beneficialOwnerID) => toParams(getOwnerValues(beneficialOwnerID)));
        const beneficialOwnersInformation = {
            ownsMoreThan25Percent: isUserUBO,
            beneficialOwners: JSON.stringify(beneficialOwners),
            beneficialOwnerKeys: ownerKeys,
        };
        send((requestID) => updateBeneficialOwners(requestID, getBankAccountParams(policyID, achData), beneficialOwnersInformation, getFieldsToClear(draft)));
    };

    const applyTransition = ({draftValues, next}: OwnerLoopTransition<UBOSubPage>) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, draftValues);
        if ('submitOwnerKeys' in next) {
            submit(next.submitOwnerKeys);
            return;
        }
        navigateToSubPage(next.subPage);
    };

    const answerQuestion = (question: UBOQuestion, answer: boolean) => applyTransition(getNextUBOSubPage(question, answer, loopState, generateOwnerID()));

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
            return {subPage: currentSubPage, title: translate('beneficialOwnerInfoStep.doYouOwn25percent', companyName), defaultValue: isUserUBO};
        }
        if (currentSubPage === SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO) {
            return {subPage: currentSubPage, title: translate('beneficialOwnerInfoStep.doAnyIndividualOwn25percent', companyName), defaultValue: isAnyoneElseUBO};
        }
        if (currentSubPage === SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS) {
            return {subPage: currentSubPage, title: translate('beneficialOwnerInfoStep.areThereMoreIndividualsWhoOwn25percent', companyName), defaultValue: false};
        }
        return undefined;
    };

    if (currentSubPage && !OUTER_SUB_PAGES.has(currentSubPage)) {
        return (
            <BeneficialOwnerDetailsFormPages
                policyID={policyID}
                beneficialOwnerBeingModifiedID={beneficialOwnerBeingModifiedID}
                isEditingCreatedBeneficialOwner={isEditingCreatedBeneficialOwner}
                ownerValues={beneficialOwnerBeingModifiedID ? getOwnerValues(beneficialOwnerBeingModifiedID) : undefined}
                hasExistingBeneficialOwners={beneficialOwnerKeys.length > 0}
                onFinished={() => applyTransition(getSubPageAfterUBODetails(loopState))}
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
                    onSelectedValue={(answer) => answerQuestion(question.subPage, answer)}
                    isLoading={isPending}
                />
            )}
            {currentSubPage === SUB_PAGE_NAMES.UBOS_LIST && (
                <CompanyOwnersListUBO
                    requestor={resolveValues(REQUESTOR_KEYS, undefined, achData)}
                    owners={(isAnyoneElseUBO ? beneficialOwnerKeys : []).map((ownerID) => ({ownerID, values: getOwnerValues(ownerID)}))}
                    isUserUBO={isUserUBO}
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

/**
 * The owner step of the NonUSD flow. The questions and the list are URL sub pages that this container renders itself,
 * and any other sub page renders the nested details form of one owner. The transitions are the pure functions of
 * `ownerLoop`. Each answer and each owner field is the draft value until the step is saved, then the saved one, and the
 * list sends every owner in one request. A user who owns the company fills in the same details form under a fixed owner
 * ID, which the signer step later relies on.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import YesNoStep from '@components/SubStepForms/YesNoStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import Navigation from '@libs/Navigation/Navigation';

import {saveOnboardingBeneficialOwners} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import type NonUSDPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/types';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';
import {generateOwnerID, resolveOwnerKeys, resolveOwnerValues} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import type {OwnerLoopTransition} from '@pages/SimplifiedBankOnboarding/utils/owners/types';
import {GLOBAL_OWNER_FIELDS, getFieldsToClear, toForm, toParams} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBeneficialOwners';
import {resolveBooleanValue} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import {clearErrors, setDraftValues} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import type {OwnerLoopState, OwnerQuestion, OwnerSubPage} from './ownerLoop';

import BeneficialOwnerDetailsFormPages from './BeneficialOwnerDetailsFormPages';
import BeneficialOwnersList from './BeneficialOwnersList';
import {getNextOwnerSubPage, getSubPageAfterOwnerDetails} from './ownerLoop';

const {PAGE_NAMES, BENEFICIAL_OWNER_INFO_SUB_PAGES: SUB_PAGE_NAMES, CURRENT_USER_KEY} = SBO_CONST.NON_USD;

const OUTER_SUB_PAGES = new Set<string>([
    SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER,
    SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER,
    SUB_PAGE_NAMES.ARE_THERE_MORE_BENEFICIAL_OWNERS,
    SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST,
]);

function BeneficialOwnerInfo({onBackButtonPress, onSubmit, policyID, stepNames, startStepIndex, currentSubPage, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const achData = account?.achData;
    const companyName = achData?.corpay?.companyName ?? draft?.companyName ?? '';
    const {send, isPending, errorMessage} = useStepRequest({onSuccess: onSubmit});

    // The draft wins over the saved answers, so an answer that the user changed is not replaced by the saved one.
    const isUserOwner = resolveBooleanValue(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, draft, achData) ?? false;
    const isAnyoneElseOwner = resolveBooleanValue(INPUT_IDS.ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE, draft, achData) ?? false;
    const savedOwners = toForm(achData?.corpay?.beneficialOwners);
    const ownerKeys = resolveOwnerKeys(draft, savedOwners);
    const ownerBeingModifiedID = draft?.ownerBeingModifiedID;

    const getOwnerValues = (ownerID: string) => resolveOwnerValues(draft, savedOwners, ownerID, GLOBAL_OWNER_FIELDS);

    const ownerIDsWithShares = ownerBeingModifiedID && !ownerKeys.includes(ownerBeingModifiedID) ? [...ownerKeys, ownerBeingModifiedID] : ownerKeys;
    const ownedPercentages = Object.fromEntries(ownerIDsWithShares.map((ownerID) => [ownerID, Number(getOwnerValues(ownerID).ownershipPercentage) || 0]));
    const loopState: OwnerLoopState = {ownerKeys, isUserOwner, ownerBeingModifiedID, isEditingCreatedOwner: draft?.isEditingCreatedOwner ?? false, ownedPercentages};

    const buildRoute = (subPage: string) => ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.BENEFICIAL_OWNER_INFO, subPage, backTo});

    const navigateToSubPage = (subPage: string) => Navigation.navigate(buildRoute(subPage));

    const navigateBackToSubPage = (subPage: string) => Navigation.goBack(buildRoute(subPage));

    const submit = (ownerKeysToSave: string[]) => {
        const details = {
            ownsMoreThan25Percent: isUserOwner,
            anyIndividualOwn25PercentOrMore: ownerKeysToSave.some((ownerID) => ownerID !== CURRENT_USER_KEY),
            beneficialOwners: JSON.stringify(ownerKeysToSave.map((ownerID) => toParams(ownerID, getOwnerValues(ownerID)))),
        };
        send((requestID) => saveOnboardingBeneficialOwners(requestID, getBankAccountParams(policyID, achData), details, getFieldsToClear(draft)));
    };

    const applyTransition = ({draftValues, next}: OwnerLoopTransition<OwnerSubPage>) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, draftValues);
        if ('submitOwnerKeys' in next) {
            submit(next.submitOwnerKeys);
            return;
        }
        navigateToSubPage(next.subPage);
    };

    const answerQuestion = (question: OwnerQuestion, answer: boolean) => applyTransition(getNextOwnerSubPage(question, answer, loopState, generateOwnerID()));

    const handleOwnerEdit = (ownerID: string) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {ownerBeingModifiedID: ownerID, isEditingCreatedOwner: true});
        navigateToSubPage(SUB_PAGE_NAMES.NAME);
    };

    const handleBackButtonPress = () => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
        if (currentSubPage === SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER) {
            onBackButtonPress();
        } else if (currentSubPage === SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER) {
            navigateBackToSubPage(SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER);
        } else if (currentSubPage === SUB_PAGE_NAMES.ARE_THERE_MORE_BENEFICIAL_OWNERS) {
            navigateBackToSubPage(SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);
        } else if (currentSubPage === SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST) {
            // The real step goes back to the confirmation of the last owner, which only exists when there is an owner.
            navigateBackToSubPage(ownerKeys.length > 0 ? SUB_PAGE_NAMES.CONFIRMATION : SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);
        } else {
            Navigation.goBack();
        }
    };

    const getQuestion = () => {
        if (currentSubPage === SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER) {
            return {subPage: currentSubPage, title: translate('ownershipInfoStep.doYouOwn', companyName), defaultValue: isUserOwner};
        }
        if (currentSubPage === SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER) {
            return {subPage: currentSubPage, title: translate('ownershipInfoStep.doesAnyoneOwn', companyName), defaultValue: isAnyoneElseOwner};
        }
        if (currentSubPage === SUB_PAGE_NAMES.ARE_THERE_MORE_BENEFICIAL_OWNERS) {
            return {subPage: currentSubPage, title: translate('ownershipInfoStep.areThereOther', companyName), defaultValue: false};
        }
        return undefined;
    };

    if (currentSubPage && !OUTER_SUB_PAGES.has(currentSubPage)) {
        return (
            <BeneficialOwnerDetailsFormPages
                policyID={policyID}
                ownerBeingModifiedID={ownerBeingModifiedID}
                ownerValues={ownerBeingModifiedID ? getOwnerValues(ownerBeingModifiedID) : undefined}
                isEditingCreatedOwner={loopState.isEditingCreatedOwner}
                totalOwnedPercentage={ownedPercentages}
                onFinished={() => applyTransition(getSubPageAfterOwnerDetails(loopState))}
                stepNames={stepNames}
                startStepIndex={startStepIndex}
                backTo={backTo}
            />
        );
    }

    const question = getQuestion();

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingBeneficialOwnerInfo"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('ownershipInfoStep.ownerInfo')}
            stepNames={stepNames}
            startStepIndex={startStepIndex}
        >
            {!!question && (
                <YesNoStep
                    // Each question is its own form, so the selected answer must not carry over to the next one.
                    key={currentSubPage}
                    title={question.title}
                    description={translate('ownershipInfoStep.regulationsRequire')}
                    defaultValue={question.defaultValue}
                    onSelectedValue={(answer) => answerQuestion(question.subPage, answer)}
                    isLoading={isPending}
                />
            )}
            {currentSubPage === SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST && (
                <BeneficialOwnersList
                    owners={ownerKeys.map((ownerID) => ({ownerID, values: getOwnerValues(ownerID)}))}
                    onConfirm={() => submit(ownerKeys)}
                    onEdit={handleOwnerEdit}
                    isRequestPending={isPending}
                    requestErrorMessage={errorMessage}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BeneficialOwnerInfo;

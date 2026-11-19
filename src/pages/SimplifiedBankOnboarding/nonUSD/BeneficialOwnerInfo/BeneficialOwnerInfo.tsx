/**
 * The owner step of the NonUSD flow, a hand-written state machine like the real `BeneficialOwnerInfo`. The questions
 * and the list are URL sub pages that this container renders itself, and any other sub page renders the nested details
 * form of one owner. The owners live in the draft, the server owners are copied into it on resume, and the step waits
 * for its single request with its own ref, the request flag and the shared `isSuccess`, like the bank step. A user who
 * owns the company fills in the same details form under a fixed owner ID, which the signer step later relies on.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import YesNoStep from '@components/SubStepForms/YesNoStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import Navigation from '@libs/Navigation/Navigation';

import {clearSaveOnboardingBeneficialOwners, saveOnboardingBeneficialOwners} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import type NonUSDPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';
import {generateOwnerID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import {clearErrors, setDraftValues} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React, {useEffect, useRef} from 'react';

import BeneficialOwnerDetailsFormPages from './BeneficialOwnerDetailsFormPages';
import BeneficialOwnersList from './BeneficialOwnersList';
import getDraftValuesForBeneficialOwners from './utils/getDraftValuesForBeneficialOwners';
import {getTotalOwnedPercentageSum} from './utils/getTotalOwnedPercentage';
import getValuesForBeneficialOwner from './utils/getValuesForBeneficialOwner';

const {PAGE_NAMES, BENEFICIAL_OWNER_INFO_SUB_PAGES: SUB_PAGE_NAMES, MAX_OWNERSHIP_SUM_TO_ADD_MORE, CURRENT_USER_KEY} = SBO_CONST.NON_USD;
const MAX_OWNERS_NEXT_TO_USER = 3;

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

    // Unlike the other steps, the saved server answers win over the draft here, as in the real step.
    const isUserOwner = achData?.corpay?.ownsMoreThan25Percent ?? draft?.ownsMoreThan25Percent ?? false;
    const isAnyoneElseOwner = achData?.corpay?.anyIndividualOwn25PercentOrMore ?? draft?.anyIndividualOwn25PercentOrMore ?? false;
    const savedBeneficialOwnerValues = getDraftValuesForBeneficialOwners(account);
    const ownerKeys = draft?.beneficialOwnerKeys ?? savedBeneficialOwnerValues.beneficialOwnerKeys;
    const canAddMoreOwners = getTotalOwnedPercentageSum(ownerKeys, draft) <= MAX_OWNERSHIP_SUM_TO_ADD_MORE;
    const isSubmittingRef = useRef(false);

    // On resume the owners that the server saved are copied into the draft once, so the sub pages can edit them.
    useEffect(() => {
        if (draft?.beneficialOwnerKeys || savedBeneficialOwnerValues.beneficialOwnerKeys.length === 0) {
            return;
        }
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, savedBeneficialOwnerValues);
    }, [draft?.beneficialOwnerKeys, savedBeneficialOwnerValues]);

    useEffect(() => {
        if (account?.errors || account?.isSavingCorpayOnboardingBeneficialOwnersFields || !account?.isSuccess) {
            return;
        }

        // The shared `isSuccess` can still be true from the previous step, so the ref tells whether this step sent the request.
        if (isSubmittingRef.current) {
            isSubmittingRef.current = false;
            onSubmit();
            clearSaveOnboardingBeneficialOwners();
        }

        // As in the real step, this cleanup runs whenever a flag changes and not only on unmount, so it can clear a request that just started.
        return () => {
            clearSaveOnboardingBeneficialOwners();
        };
    }, [account?.errors, account?.isSavingCorpayOnboardingBeneficialOwnersFields, account?.isSuccess, onSubmit]);

    const buildRoute = (subPage: string) => ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.BENEFICIAL_OWNER_INFO, subPage, backTo});

    const navigateToSubPage = (subPage: string) => Navigation.navigate(buildRoute(subPage));

    const navigateBackToSubPage = (subPage: string) => Navigation.goBack(buildRoute(subPage));

    const submit = (ownerKeysToSave: string[]) => {
        const anyIndividualOwn25PercentOrMore = ownerKeysToSave.some((ownerID) => ownerID !== CURRENT_USER_KEY);
        const beneficialOwners = JSON.stringify(ownerKeysToSave.map((ownerID) => getValuesForBeneficialOwner(ownerID, draft)));
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {ownsMoreThan25Percent: isUserOwner, anyIndividualOwn25PercentOrMore, beneficialOwners});

        isSubmittingRef.current = true;
        saveOnboardingBeneficialOwners(getBankAccountParams(policyID, achData), {ownsMoreThan25Percent: isUserOwner, anyIndividualOwn25PercentOrMore, beneficialOwners});
    };

    const prepareOwnerDetailsForm = (ownerID: string) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {ownerBeingModifiedID: ownerID});
        navigateToSubPage(SUB_PAGE_NAMES.NAME);
    };

    const handleOwnerDetailsFormFinished = () => {
        const ownerBeingModifiedID = draft?.ownerBeingModifiedID ?? CURRENT_USER_KEY;
        const isFreshOwner = !ownerKeys.includes(ownerBeingModifiedID);
        const updatedOwnerKeys = isFreshOwner ? [...ownerKeys, ownerBeingModifiedID] : ownerKeys;
        if (isFreshOwner) {
            setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {beneficialOwnerKeys: updatedOwnerKeys});
        }

        const canAddMoreAfterThisOwner = getTotalOwnedPercentageSum(updatedOwnerKeys, draft) <= MAX_OWNERSHIP_SUM_TO_ADD_MORE;
        if (draft?.isEditingCreatedOwner || !canAddMoreAfterThisOwner) {
            setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {isEditingCreatedOwner: false});
            navigateToSubPage(SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST);
            return;
        }

        // The user just entered their own data, so the question about the other owners comes next.
        if (ownerBeingModifiedID === CURRENT_USER_KEY) {
            navigateToSubPage(SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);
            return;
        }
        navigateToSubPage(SUB_PAGE_NAMES.ARE_THERE_MORE_BENEFICIAL_OWNERS);
    };

    const handleOwnerEdit = (ownerID: string) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {ownerBeingModifiedID: ownerID, isEditingCreatedOwner: true});
        navigateToSubPage(SUB_PAGE_NAMES.NAME);
    };

    const handleIsUserOwnerSelected = (value: boolean) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {ownsMoreThan25Percent: value});

        if (value) {
            // An owner holds at least 25%, so only three others fit next to the user.
            if (ownerKeys.length > MAX_OWNERS_NEXT_TO_USER) {
                setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {beneficialOwnerKeys: ownerKeys.slice(0, MAX_OWNERS_NEXT_TO_USER)});
            }
            prepareOwnerDetailsForm(CURRENT_USER_KEY);
            return;
        }
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {beneficialOwnerKeys: ownerKeys.filter((ownerID) => ownerID !== CURRENT_USER_KEY)});
        navigateToSubPage(SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);
    };

    const handleIsAnyoneElseOwnerSelected = (value: boolean) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {anyIndividualOwn25PercentOrMore: value});

        if (!value && !isUserOwner) {
            setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {beneficialOwnerKeys: []});
            submit([]);
            return;
        }
        if (!value) {
            setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {beneficialOwnerKeys: [CURRENT_USER_KEY]});
            navigateToSubPage(SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST);
            return;
        }
        if (!canAddMoreOwners) {
            navigateToSubPage(SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST);
            return;
        }
        prepareOwnerDetailsForm(generateOwnerID());
    };

    const handleAreThereMoreSelected = (value: boolean) => {
        if (!value || !canAddMoreOwners) {
            navigateToSubPage(SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST);
            return;
        }
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {anyIndividualOwn25PercentOrMore: true});
        prepareOwnerDetailsForm(generateOwnerID());
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
            return {title: translate('ownershipInfoStep.doYouOwn', companyName), defaultValue: isUserOwner};
        }
        if (currentSubPage === SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER) {
            return {title: translate('ownershipInfoStep.doesAnyoneOwn', companyName), defaultValue: isAnyoneElseOwner};
        }
        if (currentSubPage === SUB_PAGE_NAMES.ARE_THERE_MORE_BENEFICIAL_OWNERS) {
            return {title: translate('ownershipInfoStep.areThereOther', companyName), defaultValue: false};
        }
        return undefined;
    };

    const saveAnswer = (value: boolean) => {
        if (currentSubPage === SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER) {
            handleIsUserOwnerSelected(value);
        } else if (currentSubPage === SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER) {
            handleIsAnyoneElseOwnerSelected(value);
        } else {
            handleAreThereMoreSelected(value);
        }
    };

    if (currentSubPage && !OUTER_SUB_PAGES.has(currentSubPage)) {
        return (
            <BeneficialOwnerDetailsFormPages
                policyID={policyID}
                onFinished={handleOwnerDetailsFormFinished}
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
                    onSelectedValue={saveAnswer}
                    isLoading={!!account?.isSavingCorpayOnboardingBeneficialOwnersFields}
                />
            )}
            {currentSubPage === SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST && (
                <BeneficialOwnersList
                    ownerKeys={ownerKeys}
                    onConfirm={() => submit(ownerKeys)}
                    onEdit={handleOwnerEdit}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BeneficialOwnerInfo;

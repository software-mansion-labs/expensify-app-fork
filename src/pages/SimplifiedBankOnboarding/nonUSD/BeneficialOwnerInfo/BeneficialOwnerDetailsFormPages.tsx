/**
 * The details form of one NonUSD owner: a `useSubPage` flow nested in the owner step, on the same URL page. It passes
 * the owner that the step resolved and the shares of all owners to its sub pages, like the real
 * `BeneficialOwnerDetailsFormPages`.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {GlobalOwnerValues} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBeneficialOwners';

import {clearErrors, setDraftValues} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import type BeneficialOwnerSubPageProps from './types';

import Confirmation from './BeneficialOwnerDetailsFormSubSteps/Confirmation';
import Name from './BeneficialOwnerDetailsFormSubSteps/Name';
import OwnershipPercentage from './BeneficialOwnerDetailsFormSubSteps/OwnershipPercentage';

type BeneficialOwnerDetailsFormPagesProps = {
    policyID?: string;

    /** The owner that the form changes. The page shows a loader while the draft has not stored it yet. */
    ownerBeingModifiedID: string | undefined;

    /** The fields of that owner that the step resolved */
    ownerValues: GlobalOwnerValues | undefined;

    /** Whether the user opened the form from the list to change an owner that is already added */
    isEditingCreatedOwner: boolean;

    /** The share of every owner in the list and of the owner being modified, by owner ID */
    totalOwnedPercentage: Record<string, number>;

    /** Called after the confirmation page */
    onFinished: () => void;
    stepNames?: readonly string[];

    /** Position of the step in the step counter of the header */
    startStepIndex?: number;
    backTo?: string;
};

const {PAGE_NAMES, BENEFICIAL_OWNER_INFO_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.NON_USD;

const pages = [
    {pageName: SUB_PAGE_NAMES.NAME, component: Name},
    {pageName: SUB_PAGE_NAMES.OWNERSHIP_PERCENTAGE, component: OwnershipPercentage},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

function BeneficialOwnerDetailsFormPages({
    policyID,
    ownerBeingModifiedID,
    ownerValues,
    isEditingCreatedOwner,
    totalOwnedPercentage,
    onFinished,
    stepNames,
    startStepIndex,
    backTo,
}: BeneficialOwnerDetailsFormPagesProps) {
    const {translate} = useLocalize();

    const buildRoute = (pageName: string, action?: 'edit') =>
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.BENEFICIAL_OWNER_INFO, subPage: pageName, action, backTo});

    const {CurrentPage, isEditing, currentPageName, pageIndex, prevPage, nextPage, moveTo, isRedirecting} = useSubPage<BeneficialOwnerSubPageProps>({
        pages,
        startFrom: 0,
        onFinished,
        buildRoute,
    });

    const handleBackButtonPress = () => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
        if (isEditing) {
            Navigation.goBack(buildRoute(SUB_PAGE_NAMES.CONFIRMATION));
            return;
        }
        if (pageIndex > 0) {
            prevPage();
            return;
        }
        if (isEditingCreatedOwner) {
            setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {isEditingCreatedOwner: false});
            Navigation.goBack(buildRoute(SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST));
            return;
        }
        Navigation.goBack(buildRoute(SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER));
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingBeneficialOwnerInfo"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('ownershipInfoStep.ownerInfo')}
            stepNames={stepNames}
            startStepIndex={startStepIndex}
        >
            {isRedirecting || !ownerBeingModifiedID || !ownerValues ? (
                <SubPageRedirectIndicator />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    onNext={nextPage}
                    onMove={moveTo}
                    currentPageName={currentPageName}
                    ownerBeingModifiedID={ownerBeingModifiedID}
                    ownerValues={ownerValues}
                    totalOwnedPercentage={totalOwnedPercentage}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BeneficialOwnerDetailsFormPages;

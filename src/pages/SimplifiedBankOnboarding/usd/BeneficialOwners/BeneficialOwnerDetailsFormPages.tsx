/**
 * The details form of one owner: a `useSubPage` flow nested in the beneficial owners step, on the same URL page. The
 * back button of its first page goes back to the outer page that opened it, like the real
 * `BeneficialOwnerDetailsFormPages`.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {UBOValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBeneficialOwners';

import ROUTES from '@src/ROUTES';

import React from 'react';

import type BeneficialOwnerSubPageProps from './types';

import ConfirmationUBO from './subSteps/ConfirmationUBO';
import DateOfBirthUBO from './subSteps/DateOfBirthUBO';
import LegalNameUBO from './subSteps/LegalNameUBO';

type BeneficialOwnerDetailsFormPagesProps = {
    policyID?: string;

    /** The owner that the form changes. The page shows a loader while the draft has not stored it yet. */
    beneficialOwnerBeingModifiedID: string | undefined;

    /** The fields of that owner that the step resolved */
    ownerValues: UBOValues | undefined;

    /** Whether the user opened the form from the list to change an owner that is already added */
    isEditingCreatedBeneficialOwner: boolean;

    /** Whether the list already holds an owner, which decides the outer page that the back button returns to */
    hasExistingBeneficialOwners: boolean;

    /** Called after the confirmation page */
    onFinished: () => void;
    stepNames?: readonly string[];

    /** Position of the step in the step counter of the header */
    startStepIndex?: number;
    backTo?: string;
};

const {PAGE_NAMES, BENEFICIAL_OWNERS_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.USD;

const pages = [
    {pageName: SUB_PAGE_NAMES.LEGAL_NAME, component: LegalNameUBO},
    {pageName: SUB_PAGE_NAMES.DATE_OF_BIRTH, component: DateOfBirthUBO},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: ConfirmationUBO},
];

function BeneficialOwnerDetailsFormPages({
    policyID,
    beneficialOwnerBeingModifiedID,
    ownerValues,
    isEditingCreatedBeneficialOwner,
    hasExistingBeneficialOwners,
    onFinished,
    stepNames,
    startStepIndex,
    backTo,
}: BeneficialOwnerDetailsFormPagesProps) {
    const {translate} = useLocalize();

    const buildRoute = (pageName: string, action?: 'edit') =>
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.BENEFICIAL_OWNERS, subPage: pageName, action, backTo});

    const {CurrentPage, isEditing, currentPageName, pageIndex, prevPage, nextPage, moveTo, isRedirecting} = useSubPage<BeneficialOwnerSubPageProps>({
        pages,
        startFrom: 0,
        onFinished,
        buildRoute,
    });

    const getOuterSubPageBeforeForm = () => {
        if (isEditingCreatedBeneficialOwner) {
            return SUB_PAGE_NAMES.UBOS_LIST;
        }
        return hasExistingBeneficialOwners ? SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS : SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO;
    };

    const handleBackButtonPress = () => {
        if (isEditing) {
            Navigation.goBack(buildRoute(SUB_PAGE_NAMES.CONFIRMATION));
            return;
        }
        if (pageIndex === 0) {
            Navigation.goBack(buildRoute(getOuterSubPageBeforeForm()));
            return;
        }
        prevPage();
    };

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
            {isRedirecting || !beneficialOwnerBeingModifiedID || !ownerValues ? (
                <SubPageRedirectIndicator />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    onNext={nextPage}
                    onMove={moveTo}
                    currentPageName={currentPageName}
                    beneficialOwnerBeingModifiedID={beneficialOwnerBeingModifiedID}
                    ownerValues={ownerValues}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BeneficialOwnerDetailsFormPages;

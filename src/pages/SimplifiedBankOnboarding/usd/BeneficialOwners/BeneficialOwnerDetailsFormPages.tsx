/**
 * The details form of one owner: a `useSubPage` flow nested in the beneficial owners step, on the same URL page. The
 * back button of its first page goes back to the outer page that opened it, like the real
 * `BeneficialOwnerDetailsFormPages`.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import type BeneficialOwnerSubPageProps from './types';

import STEP_INDEX from './STEP_INDEX';
import ConfirmationUBO from './subSteps/ConfirmationUBO';
import DateOfBirthUBO from './subSteps/DateOfBirthUBO';
import LegalNameUBO from './subSteps/LegalNameUBO';

type BeneficialOwnerDetailsFormPagesProps = {
    policyID?: string;

    /** The owner that the form changes. The page shows a loader while the draft has not stored it yet. */
    beneficialOwnerBeingModifiedID: string | undefined;

    /** Whether the user opened the form from the list to change an owner that is already added */
    isEditingCreatedBeneficialOwner: boolean;

    /** Called after the confirmation page */
    onFinished: () => void;
    stepNames?: readonly string[];
    backTo?: string;
};

const {PAGE_NAMES, BENEFICIAL_OWNERS_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.USD;

const pages = [
    {pageName: SUB_PAGE_NAMES.LEGAL_NAME, component: LegalNameUBO},
    {pageName: SUB_PAGE_NAMES.DATE_OF_BIRTH, component: DateOfBirthUBO},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: ConfirmationUBO},
];

function BeneficialOwnerDetailsFormPages({policyID, beneficialOwnerBeingModifiedID, isEditingCreatedBeneficialOwner, onFinished, stepNames, backTo}: BeneficialOwnerDetailsFormPagesProps) {
    const {translate} = useLocalize();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const hasExistingBeneficialOwners = (draft?.beneficialOwnerKeys ?? []).length > 0;

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
            startStepIndex={STEP_INDEX}
            stepNames={stepNames}
        >
            {isRedirecting || !beneficialOwnerBeingModifiedID ? (
                <SubPageRedirectIndicator />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    onNext={nextPage}
                    onMove={moveTo}
                    currentPageName={currentPageName}
                    beneficialOwnerBeingModifiedID={beneficialOwnerBeingModifiedID}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BeneficialOwnerDetailsFormPages;

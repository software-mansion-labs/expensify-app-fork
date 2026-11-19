/**
 * The details form of one NonUSD owner: a `useSubPage` flow nested in the owner step, on the same URL page. It reads
 * the owner being changed from the draft and passes the shares of all owners to the percentage page, like the real
 * `BeneficialOwnerDetailsFormPages`.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import {clearErrors, setDraftValues} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import type BeneficialOwnerSubPageProps from './types';

import Confirmation from './BeneficialOwnerDetailsFormSubSteps/Confirmation';
import Name from './BeneficialOwnerDetailsFormSubSteps/Name';
import OwnershipPercentage from './BeneficialOwnerDetailsFormSubSteps/OwnershipPercentage';
import {STEP_INDEX} from './const';
import getTotalOwnedPercentage from './utils/getTotalOwnedPercentage';

type BeneficialOwnerDetailsFormPagesProps = {
    policyID?: string;

    /** Called after the confirmation page */
    onFinished: () => void;
    stepNames?: readonly string[];
    backTo?: string;
};

const {PAGE_NAMES, BENEFICIAL_OWNER_INFO_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.NON_USD;

const pages = [
    {pageName: SUB_PAGE_NAMES.NAME, component: Name},
    {pageName: SUB_PAGE_NAMES.OWNERSHIP_PERCENTAGE, component: OwnershipPercentage},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

function BeneficialOwnerDetailsFormPages({policyID, onFinished, stepNames, backTo}: BeneficialOwnerDetailsFormPagesProps) {
    const {translate} = useLocalize();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const ownerBeingModifiedID = draft?.ownerBeingModifiedID;
    const isEditingCreatedOwner = draft?.isEditingCreatedOwner ?? false;
    const totalOwnedPercentage = getTotalOwnedPercentage(draft?.beneficialOwnerKeys ?? [], draft);

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
            startStepIndex={STEP_INDEX}
        >
            {isRedirecting || !ownerBeingModifiedID ? (
                <SubPageRedirectIndicator />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    onNext={nextPage}
                    onMove={moveTo}
                    currentPageName={currentPageName}
                    ownerBeingModifiedID={ownerBeingModifiedID}
                    totalOwnedPercentage={totalOwnedPercentage}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BeneficialOwnerDetailsFormPages;

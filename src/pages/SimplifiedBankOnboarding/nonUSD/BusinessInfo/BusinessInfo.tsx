/**
 * The business step of the NonUSD flow. It mirrors `NonUSD/BusinessInfo/BusinessInfo.tsx`: the step asks the server for
 * the picklists of its country when it mounts, starts from the first empty input, and waits for its request with its own
 * ref, the request's flag and the shared `isSuccess`, like the bank step.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import {clearSaveOnboardingCompanyDetails, getOnboardingFields, saveOnboardingCompanyDetails} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import type NonUSDPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';
import type {SubStepValues} from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React, {useEffect, useRef} from 'react';

import BUSINESS_INFO_KEYS from './BUSINESS_INFO_KEYS';
import BusinessType from './subSteps/BusinessType';
import Confirmation from './subSteps/Confirmation';
import Name from './subSteps/Name';

const {PAGE_NAMES, BUSINESS_INFO_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.NON_USD;

const pages = [
    {pageName: SUB_PAGE_NAMES.NAME, component: Name},
    {pageName: SUB_PAGE_NAMES.BUSINESS_TYPE, component: BusinessType},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

// The position of this step in the step counter of the header
const STEP_INDEX = 2;

/** Returns the index of the first sub page with an empty input, or the confirmation page when every input has a value */
function getInitialSubPageIndex(values: SubStepValues<(typeof BUSINESS_INFO_KEYS)[keyof typeof BUSINESS_INFO_KEYS]>): number {
    if (!values.companyName) {
        return SBO_CONST.NON_USD.SUBSTEP_INDEX.BUSINESS_INFO.NAME;
    }
    if (!values.businessType) {
        return SBO_CONST.NON_USD.SUBSTEP_INDEX.BUSINESS_INFO.BUSINESS_TYPE;
    }
    return pages.length - 1;
}

function BusinessInfo({onBackButtonPress, onSubmit, policyID, stepNames, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const country = draft?.country ?? account?.achData?.country ?? '';
    const values = getSubStepValues(BUSINESS_INFO_KEYS, draft, account);
    const startFrom = getInitialSubPageIndex(values);
    const isSubmittingRef = useRef(false);

    useEffect(() => {
        getOnboardingFields(country);
    }, [country]);

    const submit = () => {
        isSubmittingRef.current = true;
        saveOnboardingCompanyDetails(getBankAccountParams(policyID, account?.achData), {companyName: values.companyName, businessType: values.businessType});
    };

    useEffect(() => {
        if (account?.errors || account?.isSavingCorpayOnboardingCompanyFields || !account?.isSuccess) {
            return;
        }

        // The shared `isSuccess` can still be true from the previous step, so the ref tells whether this step sent the request.
        if (isSubmittingRef.current) {
            isSubmittingRef.current = false;
            onSubmit();
            clearSaveOnboardingCompanyDetails();
        }

        // As in the real step, this cleanup runs whenever a flag changes and not only on unmount, so it can clear a request that just started.
        return () => {
            clearSaveOnboardingCompanyDetails();
        };
    }, [account?.errors, account?.isSavingCorpayOnboardingCompanyFields, account?.isSuccess, onSubmit]);

    const buildRoute = (pageName: string, action?: 'edit') =>
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.BUSINESS_INFO, subPage: pageName, action, backTo});

    const {CurrentPage, isEditing, currentPageName, pageIndex, nextPage, prevPage, moveTo, isRedirecting} = useSubPage({
        pages,
        startFrom,
        onFinished: submit,
        buildRoute,
    });

    const handleBackButtonPress = () => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
        if (isEditing) {
            Navigation.goBack(buildRoute(SUB_PAGE_NAMES.CONFIRMATION));
            return;
        }
        if (pageIndex === 0) {
            onBackButtonPress();
            return;
        }
        prevPage();
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingBusinessInfo"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('businessInfoStep.businessInfoTitle')}
            stepNames={stepNames}
            startStepIndex={STEP_INDEX}
        >
            {isRedirecting ? (
                <SubPageRedirectIndicator />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    onNext={nextPage}
                    onMove={moveTo}
                    currentPageName={currentPageName}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BusinessInfo;

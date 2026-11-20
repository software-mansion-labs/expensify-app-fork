/**
 * The business info step of the USD flow. It has the same container shape as the personal info step, with the differences
 * of the real step: a full screen loader while the sub page redirects, and a tax ID that loses its separators before it is
 * sent. The real step also saves after each sub page with a confirm flag. The mock action has no such flag, so this step
 * saves only once, on the confirmation page, and follows that request by its own ID.
 */
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import {updateCompanyInformation} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type USDPageProps from '@pages/SimplifiedBankOnboarding/usd/types';
import {getBankAccountParams, isAccountPastReview} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';
import {BUSINESS_INFO_KEYS, FIELDS_TO_CLEAR, toParams} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBusinessInfo';
import type {BusinessInfoValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBusinessInfo';
import {resolveValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import type BusinessInfoSubPageProps from './types';

import Confirmation from './subSteps/Confirmation';
import IncorporationType from './subSteps/IncorporationType';
import Name from './subSteps/Name';
import TaxID from './subSteps/TaxID';

type BusinessInfoProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'stepNames' | 'startStepIndex' | 'backTo'>;

const {PAGE_NAMES, BUSINESS_INFO_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.USD;
const SUBSTEP_INDEX = SBO_CONST.USD.SUBSTEP_INDEX.BUSINESS_INFO;
const CONFIRMATION_INDEX = SUBSTEP_INDEX.INCORPORATION_TYPE + 1;

const pages = [
    {pageName: SUB_PAGE_NAMES.NAME, component: Name},
    {pageName: SUB_PAGE_NAMES.TAX_ID, component: TaxID},
    {pageName: SUB_PAGE_NAMES.INCORPORATION_TYPE, component: IncorporationType},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

/** Returns the index of the first sub page that still misses data, so a returning user lands there */
function getInitialSubStepForBusinessInfo(values: BusinessInfoValues): number {
    if (values.companyName === '') {
        return SUBSTEP_INDEX.NAME;
    }
    if (values.companyTaxID === '') {
        return SUBSTEP_INDEX.TAX_ID;
    }
    if (values.incorporationType === '') {
        return SUBSTEP_INDEX.INCORPORATION_TYPE;
    }
    return CONFIRMATION_INDEX;
}

function BusinessInfo({onBackButtonPress, onSubmit, stepNames, startStepIndex, backTo}: BusinessInfoProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const policyID = account?.achData?.policyID;
    const values = resolveValues(BUSINESS_INFO_KEYS, draft, account?.achData);
    const {send, isPending, errorMessage} = useStepRequest({onSuccess: onSubmit});

    const submit = () => {
        send((requestID) => updateCompanyInformation(requestID, getBankAccountParams(policyID, account?.achData), toParams(values), FIELDS_TO_CLEAR));
    };

    const isBankAccountVerifying = account?.achData?.state === SBO_CONST.STATE.VERIFYING;
    const startFrom = isBankAccountVerifying ? 0 : getInitialSubStepForBusinessInfo(values);

    const buildRoute = (pageName: string, action?: 'edit') => ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.COMPANY, subPage: pageName, action, backTo});

    const {CurrentPage, isEditing, currentPageName, pageIndex, nextPage, prevPage, moveTo, isRedirecting} = useSubPage<BusinessInfoSubPageProps>({
        pages,
        startFrom,
        onFinished: submit,
        buildRoute,
    });

    const handleBackButtonPress = () => {
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

    if (isRedirecting) {
        return <FullScreenLoadingIndicator />;
    }

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingBusinessInfo"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            headerTitle={translate('businessInfoStep.businessInfo')}
            handleBackButtonPress={handleBackButtonPress}
            startStepIndex={startStepIndex}
            stepNames={stepNames}
        >
            <CurrentPage
                isEditing={isEditing}
                onNext={nextPage}
                onMove={moveTo}
                currentPageName={currentPageName}
                isRequestPending={isPending}
                requestErrorMessage={errorMessage}
                values={values}
                isLocked={isAccountPastReview(account?.achData)}
            />
        </InteractiveStepWrapper>
    );
}

export default BusinessInfo;

/**
 * The business info step of the USD flow. It has the same container shape as the personal info step, with the differences
 * of the real step: a full screen loader while the sub page redirects, and a tax ID that loses its separators before it is
 * sent. The real step also saves after each sub page with a confirm flag. The mock action has no such flag, so this step
 * saves only once, on the confirmation page, and waits for the answer with the shared `isLoading` (request style 1).
 */
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';
import type {SubPageProps} from '@hooks/useSubPage/types';

import Navigation from '@libs/Navigation/Navigation';

import {updateCompanyInformation} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import useOnboardingSubmitCallback from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingSubmitCallback';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type USDPageProps from '@pages/SimplifiedBankOnboarding/usd/types';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';
import type {SubStepValues} from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import BUSINESS_INFO_KEYS from './BUSINESS_INFO_KEYS';
import Confirmation from './subSteps/Confirmation';
import IncorporationType from './subSteps/IncorporationType';
import Name from './subSteps/Name';
import TaxID from './subSteps/TaxID';

type BusinessInfoProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'stepNames' | 'backTo'>;

type BusinessInfoValues = SubStepValues<typeof INPUT_IDS.COMPANY_NAME | typeof INPUT_IDS.COMPANY_TAX_ID | typeof INPUT_IDS.INCORPORATION_TYPE>;

const {PAGE_NAMES, BUSINESS_INFO_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.USD;
const SUBSTEP_INDEX = SBO_CONST.USD.SUBSTEP_INDEX.BUSINESS_INFO;
const CONFIRMATION_INDEX = SUBSTEP_INDEX.INCORPORATION_TYPE + 1;

const pages = [
    {pageName: SUB_PAGE_NAMES.NAME, component: Name},
    {pageName: SUB_PAGE_NAMES.TAX_ID, component: TaxID},
    {pageName: SUB_PAGE_NAMES.INCORPORATION_TYPE, component: IncorporationType},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

// The position of this step in the step counter of the header
const STEP_INDEX = 3;

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

function BusinessInfo({onBackButtonPress, onSubmit, stepNames, backTo}: BusinessInfoProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const policyID = account?.achData?.policyID;
    const values = getSubStepValues(BUSINESS_INFO_KEYS, draft, account);
    const markSubmitting = useOnboardingSubmitCallback(onSubmit);

    const submit = () => {
        updateCompanyInformation(getBankAccountParams(policyID, account?.achData), {
            companyName: values.companyName,
            companyTaxID: values.companyTaxID.replaceAll(CONST.REGEX.NON_NUMERIC, ''),
            incorporationType: values.incorporationType,
        });
        markSubmitting();
    };

    const isBankAccountVerifying = account?.achData?.state === SBO_CONST.STATE.VERIFYING;
    const startFrom = isBankAccountVerifying ? 0 : getInitialSubStepForBusinessInfo(values);

    const buildRoute = (pageName: string, action?: 'edit') => ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.COMPANY, subPage: pageName, action, backTo});

    const {CurrentPage, isEditing, currentPageName, pageIndex, nextPage, prevPage, moveTo, isRedirecting} = useSubPage<SubPageProps>({
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
            startStepIndex={STEP_INDEX}
            stepNames={stepNames}
        >
            <CurrentPage
                isEditing={isEditing}
                onNext={nextPage}
                onMove={moveTo}
                currentPageName={currentPageName}
            />
        </InteractiveStepWrapper>
    );
}

export default BusinessInfo;

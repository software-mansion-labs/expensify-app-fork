/**
 * The personal info step of the USD flow, and the reference for every step that is built from sub pages. It saves to the
 * server after each sub page, and only the confirmation page waits for the answer before the flow moves on.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';
import type {SubPageProps} from '@hooks/useSubPage/types';

import Navigation from '@libs/Navigation/Navigation';

import {updatePersonalInformation} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import useOnboardingSubmitCallback from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingSubmitCallback';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type USDPageProps from '@pages/SimplifiedBankOnboarding/usd/types';
import getInitialSubStepForPersonalInfo from '@pages/SimplifiedBankOnboarding/utils/getInitialSubStepForPersonalInfo';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import PERSONAL_INFO_KEYS from './PERSONAL_INFO_KEYS';
import Confirmation from './subSteps/Confirmation';
import DateOfBirth from './subSteps/DateOfBirth';
import FullName from './subSteps/FullName';
import SocialSecurityNumber from './subSteps/SocialSecurityNumber';

type PersonalInfoProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'stepNames' | 'backTo'>;

const {PAGE_NAMES, PERSONAL_INFO_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.USD;

const pages = [
    {pageName: SUB_PAGE_NAMES.FULL_NAME, component: FullName},
    {pageName: SUB_PAGE_NAMES.DATE_OF_BIRTH, component: DateOfBirth},
    {pageName: SUB_PAGE_NAMES.SSN, component: SocialSecurityNumber},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

// The position of this step in the step counter of the header
const STEP_INDEX = 2;

function PersonalInfo({onBackButtonPress, onSubmit, stepNames, backTo}: PersonalInfoProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const policyID = account?.achData?.policyID;
    const values = getSubStepValues(PERSONAL_INFO_KEYS, draft, account);
    const markSubmitting = useOnboardingSubmitCallback(onSubmit);

    const submit = (isConfirmPage: boolean) => {
        updatePersonalInformation(getBankAccountParams(policyID, account?.achData), values, isConfirmPage);
    };

    const isBankAccountVerifying = account?.achData?.state === SBO_CONST.STATE.VERIFYING;
    const startFrom = isBankAccountVerifying ? 0 : getInitialSubStepForPersonalInfo(values);

    const buildRoute = (pageName: string, action?: 'edit') =>
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.REQUESTOR, subPage: pageName, action, backTo});

    const {CurrentPage, isEditing, currentPageName, pageIndex, nextPage, prevPage, moveTo, isRedirecting} = useSubPage<SubPageProps>({
        pages,
        startFrom,
        onFinished: () => {
            submit(true);
            markSubmitting();
        },
        onPageChange: () => submit(false),
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

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingPersonalInfo"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            headerTitle={translate('personalInfoStep.personalInfo')}
            handleBackButtonPress={handleBackButtonPress}
            startStepIndex={STEP_INDEX}
            stepNames={stepNames}
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

export default PersonalInfo;

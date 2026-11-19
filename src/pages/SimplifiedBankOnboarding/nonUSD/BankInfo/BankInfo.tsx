/**
 * The bank step of the NonUSD flow, and the reference for the steps of this flow. The server describes the inputs, and
 * the single request at the end creates the bank account. The step waits for it with its own ref and the `isSuccess`
 * flag that every NonUSD request shares, then clears the flag by hand. Unlike the other steps of this flow, it watches
 * the shared `isLoading` and not a flag of its own, like the real step.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import {clearGlobalBankAccountCreation, createGlobalBankAccount, getBankAccountFields} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import type NonUSDPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import {getInitialSubStepForBankInfo, getInputKeysForBankInfoStep} from '@pages/SimplifiedBankOnboarding/utils/BankFieldUtils';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';

import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React, {useEffect, useRef} from 'react';

import type BankInfoSubStepProps from './types';

import AccountHolderDetails from './subSteps/AccountHolderDetails';
import BankAccountDetails from './subSteps/BankAccountDetails';
import Confirmation from './subSteps/Confirmation';

const {PAGE_NAMES, BANK_INFO_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.NON_USD;

const pages = [
    {pageName: SUB_PAGE_NAMES.BANK_ACCOUNT_DETAILS, component: BankAccountDetails},
    {pageName: SUB_PAGE_NAMES.ACCOUNT_HOLDER_DETAILS, component: AccountHolderDetails},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

// The position of this step in the step counter of the header
const STEP_INDEX = 1;

function BankInfo({onBackButtonPress, onSubmit, policyID, currency = '', stepNames, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [bankFields] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS);

    const country = draft?.country ?? account?.achData?.country ?? '';
    const inputKeys = getInputKeysForBankInfoStep(bankFields);
    const values = getSubStepValues(inputKeys, draft, account);
    const startFrom = getInitialSubStepForBankInfo(values, bankFields);
    const isSubmittingRef = useRef(false);

    const submit = () => {
        if (!policyID) {
            return;
        }
        isSubmittingRef.current = true;
        createGlobalBankAccount({policyID, country, currency, fields: values});
    };

    useNetwork({
        onReconnect: () => {
            getBankAccountFields(country, currency);
        },
    });

    useEffect(() => {
        if (account?.isLoading === true || !!account?.errors) {
            return;
        }

        // The shared `isSuccess` can still be true from the previous step, so the ref tells whether this step sent the request.
        if (account?.isSuccess === true && isSubmittingRef.current) {
            isSubmittingRef.current = false;
            onSubmit();
            clearGlobalBankAccountCreation();
        }
    }, [account?.errors, account?.isLoading, account?.isSuccess, onSubmit]);

    useEffect(() => {
        if (country === '') {
            return;
        }

        // The inputs in Onyx may belong to the country of another workspace, because every workspace shares this key.
        if (country === bankFields?.bankCountry && currency === bankFields?.bankCurrency) {
            return;
        }
        getBankAccountFields(country, currency);
    }, [bankFields?.bankCountry, bankFields?.bankCurrency, country, currency]);

    const buildRoute = (pageName: string, action?: 'edit') =>
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.BANK_INFO, subPage: pageName, action, backTo});

    const {CurrentPage, isEditing, currentPageName, pageIndex, nextPage, prevPage, moveTo, isRedirecting} = useSubPage<BankInfoSubStepProps>({
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

    if (bankFields?.isLoading === false && bankFields?.isSuccess === false) {
        return <NotFoundPage />;
    }

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingBankInfo"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('bankAccount.bankInfo')}
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
                    bankFields={bankFields}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BankInfo;

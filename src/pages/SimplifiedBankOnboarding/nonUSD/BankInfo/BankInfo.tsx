/**
 * The bank step of the NonUSD flow, and the reference for the steps of this flow. The server describes the inputs, and
 * the single request at the end creates the bank account. The step moves on once that request succeeds.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import {createGlobalBankAccount, getBankAccountFields} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import type NonUSDPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/types';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import {getInitialSubStepForBankInfo, getInputKeysForBankInfoStep} from '@pages/SimplifiedBankOnboarding/utils/BankFieldUtils';
import {getFieldsToClear} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBankInfo';
import {resolveValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React, {useEffect} from 'react';

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

function BankInfo({onBackButtonPress, onSubmit, policyID, currency = '', stepNames, startStepIndex, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [bankFields] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS);

    const country = draft?.country ?? account?.achData?.country ?? '';
    const inputKeys = getInputKeysForBankInfoStep(bankFields);
    const values = resolveValues(inputKeys, draft, account?.achData);
    const startFrom = getInitialSubStepForBankInfo(values, bankFields);
    const {send, isPending, errorMessage} = useStepRequest({onSuccess: onSubmit});

    const submit = () => {
        if (!policyID) {
            return;
        }
        send((requestID) => createGlobalBankAccount(requestID, {policyID, country, currency, fields: values}, getFieldsToClear(inputKeys)));
    };

    useNetwork({
        onReconnect: () => {
            getBankAccountFields(country, currency);
        },
    });

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
            startStepIndex={startStepIndex}
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
                    values={values}
                    isRequestPending={isPending}
                    requestErrorMessage={errorMessage}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default BankInfo;

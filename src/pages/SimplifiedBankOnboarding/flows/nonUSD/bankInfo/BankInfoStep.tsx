/**
 * The bank step of the NonUSD flow. The server describes the inputs for the country and currency of the account, the
 * two input pages split them, and the confirmation creates the account.
 */

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import {ConfirmationSubPage, OnboardingStep, PageLoadingIndicator, SubPage, useReadOnOpen, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import getCountryAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/country/getCountryAnswers';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import {areBankFieldsAnswered, areBankFieldsLoaded, getBankFieldDisplayValue, isAccountHolderField, splitBankFields} from './bankFields';
import PAGES from './bankInfoPages';
import {bankFieldsRead, getCreateBankAccountRequest} from './bankInfoRequests';
import getBankInfoAnswers from './getBankInfoAnswers';
import ServerDrivenFields from './ServerDrivenFields';

function BankInfoStep() {
    const {translate} = useLocalize();
    const data = useFlowData();
    const {currency} = data;
    const {country} = getCountryAnswers(data);
    const {bankFieldValues} = getBankInfoAnswers(data);
    const [bankFields] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS);

    const isLoaded = areBankFieldsLoaded(bankFields, country, currency);
    const {hasFailed} = useReadOnOpen(bankFieldsRead, {
        isEnabled: !!country && !isLoaded,
    });

    const formFields = isLoaded ? (bankFields?.formFields ?? []) : [];
    const {bankAccountFields, accountHolderFields} = splitBankFields(formFields);

    if (hasFailed) {
        return <NotFoundPage />;
    }

    return (
        <OnboardingStep
            title={translate('bankAccount.bankInfo')}
            wrapperID="SimplifiedBankOnboardingBankInfo"
        >
            <SubPage
                name={PAGES.BANK_ACCOUNT_DETAILS}
                isAnswered={isLoaded && areBankFieldsAnswered(bankAccountFields, bankFieldValues)}
            >
                <ServerDrivenFields
                    title={translate('bankInfoStep.whatAreYour')}
                    fields={bankAccountFields}
                    isLoading={!isLoaded}
                />
            </SubPage>
            <SubPage
                name={PAGES.ACCOUNT_HOLDER_DETAILS}
                isAnswered={isLoaded && areBankFieldsAnswered(accountHolderFields, bankFieldValues)}
            >
                <ServerDrivenFields
                    title={translate('addPersonalBankAccount.accountHolderInformationStepHeader')}
                    fields={accountHolderFields}
                    isLoading={!isLoaded}
                />
            </SubPage>
            {isLoaded ? (
                <ConfirmationSubPage
                    name={PAGES.CONFIRMATION}
                    title={translate('bankInfoStep.letsDoubleCheck')}
                    request={getCreateBankAccountRequest(formFields.map((field) => field.id))}
                    rows={formFields.map((field) => ({
                        label: field.label,
                        value: getBankFieldDisplayValue(field, bankFieldValues[field.id]),
                        page: isAccountHolderField(field) ? PAGES.ACCOUNT_HOLDER_DETAILS : PAGES.BANK_ACCOUNT_DETAILS,
                    }))}
                />
            ) : (
                <SubPage name={PAGES.CONFIRMATION}>
                    <PageLoadingIndicator />
                </SubPage>
            )}
        </OnboardingStep>
    );
}

export default BankInfoStep;

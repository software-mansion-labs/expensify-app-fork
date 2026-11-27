/**
 * The bank step of the NonUSD flow. The server describes the inputs for the country and currency of the account, the
 * two input pages split them, and the confirmation creates the account.
 */

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import {ConfirmationSubPage, OnboardingStep, PageLoadingIndicator, useReadOnOpen, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import getCountryAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/country/getCountryAnswers';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import {areBankFieldsAnswered, areBankFieldsLoaded, getBankFieldDisplayValue, isAccountHolderField, splitBankFields} from './bankFields';
import PAGES from './bankInfoPages';
import {bankFieldsRead, getCreateBankAccountRequest} from './bankInfoRequests';
import getBankInfoAnswers from './getBankInfoAnswers';
import ServerDrivenFields from './ServerDrivenFields';

const WRAPPER_ID = 'SimplifiedBankOnboardingBankInfo';

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

    const title = translate('bankAccount.bankInfo');

    if (!isLoaded) {
        return (
            <OnboardingStep
                title={title}
                wrapperID={WRAPPER_ID}
            >
                <PageLoadingIndicator />
            </OnboardingStep>
        );
    }

    return (
        <OnboardingStep
            title={title}
            wrapperID={WRAPPER_ID}
            pages={[
                {
                    name: PAGES.BANK_ACCOUNT_DETAILS,
                    isAnswered: areBankFieldsAnswered(bankAccountFields, bankFieldValues),
                    content: (
                        <ServerDrivenFields
                            title={translate('bankInfoStep.whatAreYour')}
                            fields={bankAccountFields}
                        />
                    ),
                },
                {
                    name: PAGES.ACCOUNT_HOLDER_DETAILS,
                    isAnswered: areBankFieldsAnswered(accountHolderFields, bankFieldValues),
                    content: (
                        <ServerDrivenFields
                            title={translate('addPersonalBankAccount.accountHolderInformationStepHeader')}
                            fields={accountHolderFields}
                        />
                    ),
                },
                {
                    name: PAGES.CONFIRMATION,
                    content: (
                        <ConfirmationSubPage
                            title={translate('bankInfoStep.letsDoubleCheck')}
                            request={getCreateBankAccountRequest(formFields.map((field) => field.id))}
                            rows={formFields.map((field) => ({
                                label: field.label,
                                value: getBankFieldDisplayValue(field, bankFieldValues[field.id]),
                                page: isAccountHolderField(field) ? PAGES.ACCOUNT_HOLDER_DETAILS : PAGES.BANK_ACCOUNT_DETAILS,
                            }))}
                        />
                    ),
                },
            ]}
        />
    );
}

export default BankInfoStep;

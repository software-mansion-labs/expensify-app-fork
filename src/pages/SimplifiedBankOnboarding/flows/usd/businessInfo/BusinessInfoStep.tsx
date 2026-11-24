/**
 * The business info step of the USD flow: company name, tax ID and company type, then a confirmation that sends the one
 * request of the step. Once the server checked the company, the name and the tax ID lock. While the server reviews the
 * setup, the step always opens at the first page.
 */
import PushRowWithModal from '@components/PushRowWithModal';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {isValidCompanyName, isValidTaxID} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {areCompanyDetailsLocked, isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {ConfirmationSubPage, FormSubPage, OnboardingStep, SingleFieldSubPage, SubPageInput, useFlowData} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';

import React from 'react';
import {View} from 'react-native';

import businessInfoRequest from './businessInfoRequest';
import getBusinessInfoAnswers from './getBusinessInfoAnswers';

const {BUSINESS_INFO_SUB_PAGES: PAGES} = SBO_CONST.USD;

const INCORPORATION_TYPE_OPTIONS: Record<string, string> = Object.fromEntries(
    Object.values(SBO_CONST.USD.INCORPORATION_TYPES).map((incorporationType) => [incorporationType, incorporationType]),
);

function validateCompanyName(value: string): TranslationPaths | undefined {
    return isValidCompanyName(value) ? undefined : 'bankAccount.error.companyName';
}

function validateTaxID(value: string): TranslationPaths | undefined {
    return isValidTaxID(value) ? undefined : 'bankAccount.error.taxID';
}

function BusinessInfoStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const data = useFlowData();
    const answers = getBusinessInfoAnswers(data);
    const achData = data.account?.achData;

    return (
        <OnboardingStep
            title={translate('businessInfoStep.businessInfo')}
            wrapperID="SimplifiedBankOnboardingBusinessInfo"
            startAt={isVerifying(achData) ? PAGES.NAME : undefined}
            shouldEnableMaxHeight
            shouldEnablePickerAvoiding={false}
        >
            <SingleFieldSubPage
                name={PAGES.NAME}
                isAnswered={!!answers.companyName}
                title={translate('businessInfoStep.enterTheNameOfYourBusiness')}
                label={translate('businessInfoStep.businessName')}
                inputID={INPUT_IDS.COMPANY_NAME}
                validate={validateCompanyName}
                defaultValue={answers.companyName}
                isLocked={areCompanyDetailsLocked(achData)}
            />
            <SingleFieldSubPage
                name={PAGES.TAX_ID}
                isAnswered={!!answers.companyTaxID}
                title={translate('businessInfoStep.enterYourCompanyTaxIdNumber')}
                hint={`The mock server rejects ${SBO_CONST.MOCK.REJECTED_TAX_ID}.`}
                label={translate('businessInfoStep.taxIDNumber')}
                placeholder={translate('businessInfoStep.taxIDNumberPlaceholder')}
                inputID={INPUT_IDS.COMPANY_TAX_ID}
                inputMode={CONST.INPUT_MODE.NUMERIC}
                validate={validateTaxID}
                defaultValue={answers.companyTaxID}
                isLocked={areCompanyDetailsLocked(achData)}
            />
            <FormSubPage
                name={PAGES.INCORPORATION_TYPE}
                isAnswered={!!answers.incorporationType}
                title={translate('businessInfoStep.selectYourCompanyType')}
                inputIDs={[INPUT_IDS.INCORPORATION_TYPE]}
                shouldHideFixErrorsAlert
            >
                <View style={[styles.mt3, styles.mhn5]}>
                    <SubPageInput
                        InputComponent={PushRowWithModal}
                        optionsList={INCORPORATION_TYPE_OPTIONS}
                        description={translate('businessInfoStep.companyType')}
                        modalHeaderTitle={translate('businessInfoStep.companyType')}
                        searchInputTitle={translate('businessInfoStep.companyType')}
                        defaultValue={answers.incorporationType}
                        inputID={INPUT_IDS.INCORPORATION_TYPE}
                    />
                </View>
            </FormSubPage>
            <ConfirmationSubPage
                name={PAGES.CONFIRMATION}
                title={translate('businessInfoStep.letsDoubleCheck')}
                request={businessInfoRequest}
                rows={[
                    {label: translate('businessInfoStep.businessName'), value: answers.companyName, page: PAGES.NAME},
                    {label: translate('businessInfoStep.taxIDNumber'), value: answers.companyTaxID, page: PAGES.TAX_ID},
                    {label: translate('businessInfoStep.companyType'), value: answers.incorporationType, page: PAGES.INCORPORATION_TYPE},
                ]}
            />
        </OnboardingStep>
    );
}

export default BusinessInfoStep;

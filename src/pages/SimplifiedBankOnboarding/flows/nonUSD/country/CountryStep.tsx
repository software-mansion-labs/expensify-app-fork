/**
 * The country step of the NonUSD flow: the currency of the workspace and the country of its bank. Only EUR offers a
 * choice, and only until the account exists, because the account belongs to that country.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import PushRowWithModal from '@components/PushRowWithModal';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {isGlobalAccountCreated} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';
import {OnboardingStep, useOnboardingFlow, useSubPageSubmit} from '@pages/SimplifiedBankOnboarding/core';
import {useNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function getCountryOptions(currency: string, translate: LocalizedTranslate): Record<string, string> {
    if (currency === SBO_CONST.CURRENCY.EUR) {
        return Object.fromEntries(SBO_CONST.EUR_COUNTRIES.map((country) => [country, translate(`allCountries.${country}`)]));
    }
    if (currency === SBO_CONST.CURRENCY.AUD) {
        return {[SBO_CONST.COUNTRY.AU]: translate('allCountries.AU')};
    }
    return {};
}

function CountryPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {formID} = useOnboardingFlow();
    const {currency, country} = useNonUSDAnswers();
    const [isAccountCreated] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => isGlobalAccountCreated(account?.achData)});
    const {submit} = useSubPageSubmit({});

    const countryOptions = getCountryOptions(currency, translate);

    const validateCountry = (values: OnboardingDraft): SubPageFormErrors => (isRequiredFulfilled(values.country ?? '') ? {} : {[INPUT_IDS.COUNTRY]: translate('common.error.fieldRequired')});

    const submitCountry = (values: OnboardingDraft) => submit({[INPUT_IDS.COUNTRY]: values.country});

    return (
        <FormProvider
            formID={formID}
            submitButtonText={translate('common.confirm')}
            validate={validateCountry}
            onSubmit={submitCountry}
            style={styles.flexGrow1}
            submitButtonStyles={[styles.mh5, styles.pb0]}
            isSubmitDisabled={Object.keys(countryOptions).length === 0}
            shouldHideFixErrorsAlert
            enabledWhenOffline
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.ph5, styles.mb3]}>{translate('countryStep.confirmBusinessBank')}</Text>
            <MenuItemField
                name={translate('common.currency')}
                value={currency}
            />
            <InputWrapper
                InputComponent={PushRowWithModal}
                optionsList={countryOptions}
                description={translate('common.country')}
                modalHeaderTitle={translate('countryStep.selectCountry')}
                searchInputTitle={translate('countryStep.findCountry')}
                shouldAllowChange={currency === SBO_CONST.CURRENCY.EUR && !isAccountCreated}
                defaultValue={country}
                inputID={INPUT_IDS.COUNTRY}
                shouldSaveDraft={false}
            />
        </FormProvider>
    );
}

function CountryStep() {
    const {translate} = useLocalize();

    return (
        <OnboardingStep
            title={translate('countryStep.confirmCurrency')}
            wrapperID="SimplifiedBankOnboardingCountry"
        >
            <CountryPage />
        </OnboardingStep>
    );
}

export default CountryStep;

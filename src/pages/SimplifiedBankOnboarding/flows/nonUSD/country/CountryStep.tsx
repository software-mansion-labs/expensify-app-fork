/**
 * The country step of the NonUSD flow: the currency of the workspace and the country of its bank. Only EUR offers a
 * choice, and only until the account exists, because the account belongs to that country.
 */
import InputWrapper from '@components/Form/InputWrapper';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import PushRowWithModal from '@components/PushRowWithModal';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {isGlobalAccountCreated} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {FormSubPage, OnboardingStep, useFlowData} from '@pages/SimplifiedBankOnboarding/core';

import React from 'react';
import {View} from 'react-native';

import getCountryAnswers from './getCountryAnswers';

function getCountryOptions(currency: string | undefined, translate: LocalizedTranslate): Record<string, string> {
    if (currency === SBO_CONST.CURRENCY.EUR) {
        return Object.fromEntries(SBO_CONST.EUR_COUNTRIES.map((country) => [country, translate(`allCountries.${country}`)]));
    }
    if (currency === SBO_CONST.CURRENCY.AUD) {
        return {[SBO_CONST.COUNTRY.AU]: translate('allCountries.AU')};
    }
    return {};
}

function CountryStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const data = useFlowData();
    const {currency} = data;
    const {country} = getCountryAnswers(data);
    const isAccountCreated = isGlobalAccountCreated(data.account?.achData);

    const countryOptions = getCountryOptions(currency, translate);

    return (
        <OnboardingStep
            title={translate('countryStep.confirmCurrency')}
            wrapperID="SimplifiedBankOnboardingCountry"
        >
            <FormSubPage
                title={translate('countryStep.confirmBusinessBank')}
                inputIDs={[INPUT_IDS.COUNTRY]}
                submitButtonText={translate('common.confirm')}
                submitButtonStyles={styles.pb0}
                isSubmitDisabled={Object.keys(countryOptions).length === 0}
                shouldHideFixErrorsAlert
            >
                <View style={[styles.mt3, styles.mhn5]}>
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
                </View>
            </FormSubPage>
        </OnboardingStep>
    );
}

export default CountryStep;

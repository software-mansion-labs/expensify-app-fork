/**
 * The country step of the NonUSD flow. It mirrors `CountryFullStep`: the currency of the workspace decides the countries,
 * so a EUR workspace picks one of its countries and an AUD workspace gets its only country locked. Confirm only keeps the
 * country in the draft, because the server receives it later together with the bank account.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import PushRowWithModal from '@components/PushRowWithModal';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import {updateOnboardingDraft} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';

import React, {useEffect} from 'react';

import type NonUSDPageProps from './types';

const STEP_FIELDS = [INPUT_IDS.COUNTRY];

// The position of this step in the step counter of the header
const STEP_INDEX = 0;

function getCountryOptions(currency: string, translate: LocalizedTranslate): Record<string, string> {
    if (currency === SBO_CONST.CURRENCY.EUR) {
        return Object.fromEntries(SBO_CONST.EUR_COUNTRIES.map((country) => [country, translate(`allCountries.${country}`)]));
    }
    if (currency === SBO_CONST.CURRENCY.AUD) {
        return {[SBO_CONST.COUNTRY.AU]: translate('allCountries.AU')};
    }
    return {};
}

function Country({onBackButtonPress, onSubmit, currency = '', stepNames}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    // Like in the real flow, the country is locked once the bank account exists, because the account belongs to that country.
    const shouldAllowChange = currency === SBO_CONST.CURRENCY.EUR && !account?.achData?.created;
    const savedCountry = draft?.country ?? account?.achData?.country ?? '';
    const defaultCountry = currency === SBO_CONST.CURRENCY.AUD ? SBO_CONST.COUNTRY.AU : savedCountry;
    const countryOptions = getCountryOptions(currency, translate);

    useEffect(() => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
    }, []);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> =>
        getFieldRequiredErrors(values, STEP_FIELDS, translate);

    const handleSubmit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>) => {
        updateOnboardingDraft({country: values.country});
        onSubmit();
    };

    const handleBackButtonPress = () => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
        onBackButtonPress();
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingCountry"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('countryStep.confirmCurrency')}
            stepNames={stepNames}
            startStepIndex={STEP_INDEX}
        >
            <FormProvider
                formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                submitButtonText={translate('common.confirm')}
                validate={validate}
                onSubmit={handleSubmit}
                style={styles.flexGrow1}
                submitButtonStyles={[styles.mh5, styles.pb0]}
                isSubmitDisabled={Object.keys(countryOptions).length === 0}
                shouldHideFixErrorsAlert
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
                    shouldAllowChange={shouldAllowChange}
                    defaultValue={defaultCountry}
                    inputID={INPUT_IDS.COUNTRY}
                    shouldSaveDraft={false}
                />
            </FormProvider>
        </InteractiveStepWrapper>
    );
}

export default Country;

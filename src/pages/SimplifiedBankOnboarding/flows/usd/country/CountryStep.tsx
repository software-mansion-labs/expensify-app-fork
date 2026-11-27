/**
 * The country step of the USD flow. The country is locked to the United States, so the picker is a row that cannot be
 * opened, like the one `CountryFullStep` shows for a USD workspace. Confirming saves the country to the draft and sends
 * nothing, so it works offline.
 */
import PushRowWithModal from '@components/PushRowWithModal';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {FormSubPage, OnboardingStep, SubPageInput} from '@pages/SimplifiedBankOnboarding/core';

import React from 'react';
import {View} from 'react-native';

function CountryStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    return (
        <OnboardingStep
            title={translate('countryStep.confirmCurrency')}
            wrapperID="SimplifiedBankOnboardingCountry"
        >
            <FormSubPage
                title={translate('countryStep.confirmBusinessBank')}
                inputIDs={[INPUT_IDS.COUNTRY]}
                submitButtonText={translate('common.confirm')}
                shouldHideFixErrorsAlert
            >
                <View style={[styles.mt3, styles.mhn5]}>
                    <SubPageInput
                        InputComponent={PushRowWithModal}
                        optionsList={{[SBO_CONST.COUNTRY.US]: translate('allCountries.US')}}
                        description={translate('common.country')}
                        modalHeaderTitle={translate('countryStep.selectCountry')}
                        searchInputTitle={translate('countryStep.findCountry')}
                        shouldAllowChange={false}
                        value={SBO_CONST.COUNTRY.US}
                        inputID={INPUT_IDS.COUNTRY}
                    />
                </View>
            </FormSubPage>
        </OnboardingStep>
    );
}

export default CountryStep;

/**
 * The country step of the USD flow. The country is locked to the United States, so the picker is a row that cannot be
 * opened, like the one `CountryFullStep` shows for a USD workspace. Confirming only writes on the client and sends no
 * request, the same as `goToWithdrawalAccountSetupStep` in the real step.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import PushRowWithModal from '@components/PushRowWithModal';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {goToSetupStep, updateOnboardingDraft} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import type USDPageProps from './types';

type CountryProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'stepNames'>;

function Country({onSubmit, onBackButtonPress, stepNames}: CountryProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const countryOptions = {[SBO_CONST.COUNTRY.US]: translate('allCountries.US')};

    const submit = () => {
        updateOnboardingDraft({country: SBO_CONST.COUNTRY.US});
        goToSetupStep(SBO_CONST.USD.STEP.BANK_ACCOUNT);
        onSubmit();
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingCountry"
            handleBackButtonPress={onBackButtonPress}
            headerTitle={translate('countryStep.confirmCurrency')}
            stepNames={stepNames}
            startStepIndex={0}
        >
            <FormProvider
                formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                submitButtonText={translate('common.confirm')}
                onSubmit={submit}
                style={styles.flexGrow1}
                submitButtonStyles={[styles.mh5, styles.pb0]}
                shouldHideFixErrorsAlert
            >
                <Text style={[styles.textHeadlineLineHeightXXL, styles.ph5, styles.mb3]}>{translate('countryStep.confirmBusinessBank')}</Text>
                <InputWrapper
                    InputComponent={PushRowWithModal}
                    optionsList={countryOptions}
                    description={translate('common.country')}
                    modalHeaderTitle={translate('countryStep.selectCountry')}
                    searchInputTitle={translate('countryStep.findCountry')}
                    shouldAllowChange={false}
                    value={SBO_CONST.COUNTRY.US}
                    inputID={INPUT_IDS.COUNTRY}
                    shouldSaveDraft={false}
                />
            </FormProvider>
        </InteractiveStepWrapper>
    );
}

export default Country;

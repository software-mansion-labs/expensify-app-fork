/* eslint-disable no-console */
import type {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback, useState} from 'react';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import AmountForm from '@components/AmountForm';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import * as ErrorUtils from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import * as PolicyUtils from '@libs/PolicyUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/WorkspaceTaxValueForm';
import type * as OnyxTypes from '@src/types/onyx';

type ValuePageOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.TaxRatesWithDefault>;
};

type ValuePageProps = ValuePageOnyxProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_VALUE>;

function ValuePage({
    route: {
        params: {policyID, taxID},
    },
    policyTaxRates,
}: ValuePageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const currentTaxRate = PolicyUtils.getTaxByID(policyTaxRates, taxID);
    const [value, setValue] = useState(currentTaxRate?.value?.replace('%', ''));

    // TODO: Extract it to a separate file, and use it also when creating a new tax
    const validate = useCallback((values: FormOnyxValues<typeof ONYXKEYS.FORMS.WORKSPACE_TAX_VALUE_FORM>) => {
        const errors = {};

        if (Number(values.value) < 0 || Number(values.value) >= 100) {
            ErrorUtils.addErrorMessage(errors, 'value', 'Percentage must be between 0 and 100');
        }

        return errors;
    }, []);

    const submit = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.WORKSPACE_TAX_VALUE_FORM>) => {
            // TODO: Add API call to update tax value
            console.log({values});
            Navigation.goBack(ROUTES.WORKSPACE_TAXES_EDIT.getRoute(policyID ?? '', taxID));
        },
        [policyID, taxID],
    );

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={ValuePage.displayName}
        >
            <HeaderWithBackButton title={translate('workspace.taxes.value')} />

            <FormProvider
                formID={ONYXKEYS.FORMS.WORKSPACE_TAX_VALUE_FORM}
                submitButtonText={translate('workspace.editor.save')}
                style={[styles.flexGrow1, styles.ph5]}
                scrollContextEnabled
                validate={validate}
                onSubmit={submit}
                enabledWhenOffline
            >
                <InputWrapper
                    InputComponent={AmountForm}
                    inputID={INPUT_IDS.VALUE}
                    defaultValue={value}
                    onInputChange={setValue}
                    hideCurrency
                    extraSymbol={<Text style={styles.iouAmountText}>%</Text>}
                />
            </FormProvider>
        </ScreenWrapper>
    );
}

ValuePage.displayName = 'ValuePage';

export default withOnyx<ValuePageProps, ValuePageOnyxProps>({
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route.params.policyID}`,
    },
})(ValuePage);

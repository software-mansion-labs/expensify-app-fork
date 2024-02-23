/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/naming-convention */

/* eslint-disable no-console */
import type {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback, useState} from 'react';
import {View} from 'react-native';
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
import * as Policy from '@libs/actions/Policy';
import * as ErrorUtils from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import * as PolicyUtils from '@libs/PolicyUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type ValuePageOnyxProps = {
    workspaceTax: OnyxEntry<OnyxTypes.WorkspaceTax>;
    policyTaxRates: OnyxEntry<OnyxTypes.PolicyTaxRateWithDefault>;
};

type ValuePageProps = ValuePageOnyxProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_VALUE>;

function ValuePage({
    route: {
        params: {policyID, taxName},
    },
    workspaceTax,
    policyTaxRates,
}: ValuePageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const currentTaxRate = PolicyUtils.getTaxByID(policyTaxRates, taxName);
    const isEditPage = !!currentTaxRate?.name;
    const [value, setValue] = useState(isEditPage ? currentTaxRate?.value : workspaceTax?.value);

    const validate = useCallback((values: FormOnyxValues<typeof ONYXKEYS.FORMS.WORKSPACE_TAX_FORM>) => {
        const errors = {};

        if (Number(values.value) < 0 || Number(values.value) >= 100) {
            ErrorUtils.addErrorMessage(errors, 'value', 'test');
        }

        return errors;
    }, []);

    const submit = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.WORKSPACE_TAX_FORM>) => {
            if (!isEditPage) {
                Policy.setTaxValue(values.value);
            }
            Navigation.goBack(ROUTES.WORKSPACE_TAXES_EDIT.getRoute(policyID ?? '', taxName));
        },
        [policyID, taxName, isEditPage],
    );

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={ValuePage.displayName}
        >
            <HeaderWithBackButton title={translate('workspace.taxes.value')} />

            <FormProvider
                formID={ONYXKEYS.FORMS.WORKSPACE_TAX_FORM}
                submitButtonText={translate('workspace.editor.save')}
                style={[styles.flexGrow1, styles.ph5]}
                scrollContextEnabled
                validate={validate}
                onSubmit={submit}
                enabledWhenOffline
            >
                <View style={styles.mb4}>
                    <InputWrapper
                        InputComponent={AmountForm}
                        inputID="value"
                        value={value}
                        onInputChange={setValue}
                        hideCurrency
                        extraSymbol={<Text style={styles.iouAmountText}>%</Text>}
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

ValuePage.displayName = 'ValuePage';

export default withOnyx<ValuePageProps, ValuePageOnyxProps>({
    workspaceTax: {
        key: ONYXKEYS.WORKSPACE_TAX,
    },
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATE}${route.params.policyID}`,
    },
})(ValuePage);

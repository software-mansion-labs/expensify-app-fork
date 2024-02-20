import type {StackScreenProps} from '@react-navigation/stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import AmountForm from '@components/AmountForm';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
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

type ValuePageProps = ValuePageOnyxProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_EDIT_VALUE>;

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
    const initialValue = currentTaxRate?.value.replace('%', '') ?? '';
    const [value, setValue] = useState(initialValue);

    const submit = () => {
        Navigation.goBack(ROUTES.WORKSPACE_TAXES_EDIT.getRoute(policyID ?? '', taxName));
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={ValuePage.displayName}
        >
            <HeaderWithBackButton title={translate('workspace.taxes.value')} />

            <FormProvider
                formID={ONYXKEYS.FORMS.WORKSPACE_DESCRIPTION_FORM}
                submitButtonText={translate('workspace.editor.save')}
                style={[styles.flexGrow1, styles.ph5]}
                scrollContextEnabled
                onSubmit={submit}
                enabledWhenOffline
            >
                <View style={styles.mb4}>
                    <InputWrapper
                        // This needs to be replaced with new NumberForm with '%' at the end
                        InputComponent={AmountForm}
                        inputID="name"
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
        key: ONYXKEYS.WORKSPACE_TAX_EDIT,
    },
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATE}${route.params.policyID}`,
    },
})(ValuePage);

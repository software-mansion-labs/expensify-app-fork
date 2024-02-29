import type {StackScreenProps} from '@react-navigation/stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/WorkspaceTaxCustomNameForm';
import type * as OnyxTypes from '@src/types/onyx';

type WorkspaceTaxesSettingsCustomTaxNameOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.TaxRatesWithDefault>;
};

type WorkspaceTaxesSettingsCustomTaxNameProps = WorkspaceTaxesSettingsCustomTaxNameOnyxProps &
    StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_CUSTOM_TAX_NAME>;

function WorkspaceTaxesSettingsCustomTaxName({
    route: {
        params: {policyID},
    },
    policyTaxRates,
}: WorkspaceTaxesSettingsCustomTaxNameProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [name, setName] = useState(policyTaxRates?.name ?? '');

    const submit = () => {
        Navigation.goBack(ROUTES.WORKSPACE_TAXES_SETTINGS.getRoute(policyID ?? ''));
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={WorkspaceTaxesSettingsCustomTaxName.displayName}
        >
            <HeaderWithBackButton title={translate('workspace.taxes.settings.customTaxName')} />

            <FormProvider
                formID={ONYXKEYS.FORMS.WORKSPACE_TAX_CUSTOM_NAME}
                submitButtonText={translate('workspace.editor.save')}
                style={[styles.flexGrow1, styles.ph5]}
                scrollContextEnabled
                onSubmit={submit}
            >
                <View style={styles.mb4}>
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.NAME}
                        label={translate('workspace.editor.nameInputLabel')}
                        accessibilityLabel={translate('workspace.editor.nameInputLabel')}
                        value={name}
                        maxLength={CONST.TAX_RATES.NAME_MAX_LENGTH}
                        autoFocus
                        onChangeText={setName}
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

WorkspaceTaxesSettingsCustomTaxName.displayName = 'WorkspaceTaxesSettingsCustomTaxName';

export default withOnyx<WorkspaceTaxesSettingsCustomTaxNameProps, WorkspaceTaxesSettingsCustomTaxNameOnyxProps>({
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route.params.policyID}`,
    },
})(WorkspaceTaxesSettingsCustomTaxName);

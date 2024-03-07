import type {StackScreenProps} from '@react-navigation/stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {setPolicyCustomTaxName} from '@libs/actions/TaxRate';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/WorkspaceTaxCustomNameForm';

type WorkspaceTaxesSettingsCustomTaxNameProps = WithPolicyAndFullscreenLoadingProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_CUSTOM_TAX_NAME>;

function WorkspaceTaxesSettingsCustomTaxName({
    route: {
        params: {policyID},
    },
    policy,
}: WorkspaceTaxesSettingsCustomTaxNameProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [name, setName] = useState(policy?.taxRates?.name ?? '');

    const submit = () => {
        setPolicyCustomTaxName({policyID, customTaxName: name});
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
                        autoGrowHeight
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

WorkspaceTaxesSettingsCustomTaxName.displayName = 'WorkspaceTaxesSettingsCustomTaxName';

export default withPolicyAndFullscreenLoading(WorkspaceTaxesSettingsCustomTaxName);

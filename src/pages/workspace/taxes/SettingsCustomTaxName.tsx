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
import * as PolicyUtils from '@libs/PolicyUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type SettingsCustomTaxNameOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.PolicyTaxRateWithDefault>;
};

type SettingsCustomTaxNameProps = SettingsCustomTaxNameOnyxProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_EDIT_VALUE>;

function SettingsCustomTaxName({
    route: {
        params: {policyID, taxName},
    },
    policyTaxRates,
}: SettingsCustomTaxNameProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [name, setName] = useState(policyTaxRates?.name ?? '');

    const submit = () => {
        Navigation.goBack(ROUTES.WORKSPACE_TAXES_EDIT.getRoute(policyID ?? '', taxName));
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={SettingsCustomTaxName.displayName}
        >
            <HeaderWithBackButton title={translate('workspace.taxes.settings.customTaxName')} />

            <FormProvider
                // TODO: Change formID
                formID={ONYXKEYS.FORMS.WORKSPACE_DESCRIPTION_FORM}
                submitButtonText={translate('workspace.editor.save')}
                style={[styles.flexGrow1, styles.ph5]}
                scrollContextEnabled
                onSubmit={submit}
            >
                <View style={styles.mb4}>
                    <InputWrapper
                        InputComponent={TextInput}
                        role={CONST.ROLE.PRESENTATION}
                        inputID="name"
                        label={translate('workspace.editor.nameInputLabel')}
                        accessibilityLabel={translate('workspace.editor.nameInputLabel')}
                        value={name}
                        maxLength={CONST.REPORT_DESCRIPTION.MAX_LENGTH}
                        spellCheck={false}
                        autoFocus
                        onChangeText={setName}
                        autoGrowHeight
                        containerStyles={[styles.autoGrowHeightMultilineInput]}
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

SettingsCustomTaxName.displayName = 'SettingsCustomTaxName';

export default withOnyx<SettingsCustomTaxNameProps, SettingsCustomTaxNameOnyxProps>({
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route.params.policyID}`,
    },
})(SettingsCustomTaxName);

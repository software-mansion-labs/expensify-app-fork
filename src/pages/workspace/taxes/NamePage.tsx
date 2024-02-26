import type {StackScreenProps} from '@react-navigation/stack';
import ExpensiMark from 'expensify-common/lib/ExpensiMark';
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
import * as Policy from '@libs/actions/Policy';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import * as PolicyUtils from '@libs/PolicyUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type NamePageOnyxProps = {
    workspaceTax: OnyxEntry<OnyxTypes.WorkspaceTax>;
    policyTaxRates: OnyxEntry<OnyxTypes.PolicyTaxRateWithDefault>;
};

type NamePageProps = NamePageOnyxProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_VALUE>;

const parser = new ExpensiMark();

function NamePage({
    route: {
        params: {policyID, taxName},
    },
    workspaceTax,
    policyTaxRates,
}: NamePageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const currentTaxRate = PolicyUtils.getTaxByID(policyTaxRates, taxName);
    const isEditPage = !!currentTaxRate?.name;

    const [name, setName] = useState(() => parser.htmlToMarkdown((isEditPage ? currentTaxRate?.name : workspaceTax?.name) ?? ''));

    const submit = () => {
        if (!isEditPage) {
            Policy.setTaxName(name);
        }

        Navigation.goBack(ROUTES.WORKSPACE_TAXES_EDIT.getRoute(policyID ?? '', taxName));
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={NamePage.displayName}
        >
            <HeaderWithBackButton title={translate('workspace.taxes.name')} />

            <FormProvider
                formID={ONYXKEYS.FORMS.WORKSPACE_TAX_FORM}
                submitButtonText={translate('workspace.editor.save')}
                style={[styles.flexGrow1, styles.ph5]}
                scrollContextEnabled
                onSubmit={submit}
                enabledWhenOffline
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

NamePage.displayName = 'NamePage';

export default withOnyx<NamePageProps, NamePageOnyxProps>({
    workspaceTax: {
        key: ONYXKEYS.WORKSPACE_TAX,
    },
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route.params.policyID}`,
    },
})(NamePage);

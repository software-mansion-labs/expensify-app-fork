import type {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback} from 'react';
import {View} from 'react-native';
import AmountPicker from '@components/AmountPicker';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TextPicker from '@components/TextPicker';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import * as ValidationUtils from '@libs/ValidationUtils';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/WorkspaceTaxForm';

type WorkspaceNewTaxPageProps = StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_NEW>;

function WorkspaceNewTaxPage({
    route: {
        params: {policyID},
    },
}: WorkspaceNewTaxPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const validate = useCallback((values: FormOnyxValues<typeof ONYXKEYS.FORMS.WORKSPACE_TAX_FORM>): Partial<Record<string, TranslationPaths>> => {
        const errors = ValidationUtils.getFieldRequiredErrors(values, [INPUT_IDS.VALUE, INPUT_IDS.NAME]);

        const value = Number(values[INPUT_IDS.VALUE]);
        if (value > 100 || value < 0) {
            errors[INPUT_IDS.VALUE] = 'workspace.taxes.errors.value.percentageRange';
        }

        return errors;
    }, []);

    const submitForm = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.WORKSPACE_TAX_FORM>) => {
            // TODO: Call API to create new tax
            console.log('submitForm', {policyID, values});
        },
        [policyID],
    );

    return (
        <ScreenWrapper
            testID={WorkspaceNewTaxPage.displayName}
            style={styles.mb5}
        >
            <View style={[styles.h100, styles.flex1, styles.justifyContentBetween]}>
                <HeaderWithBackButton title="New rate" />
                <FormProvider
                    style={[styles.flexGrow1]}
                    formID={ONYXKEYS.FORMS.WORKSPACE_TAX_FORM}
                    onSubmit={submitForm}
                    validate={validate}
                    submitButtonText={translate('common.save')}
                    enabledWhenOffline
                >
                    <InputWrapper
                        InputComponent={AmountPicker}
                        inputID={INPUT_IDS.VALUE}
                        description={translate('workspace.taxes.value')}
                        rightLabel={translate('common.required')}
                    />
                    <InputWrapper
                        InputComponent={TextPicker}
                        inputID={INPUT_IDS.NAME}
                        description={translate('workspace.taxes.name')}
                        rightLabel={translate('common.required')}
                        accessibilityLabel={translate('workspace.editor.nameInputLabel')}
                        maxLength={CONST.TAX_RATES.NAME_MAX_LENGTH}
                        autoFocus
                    />
                </FormProvider>
            </View>
        </ScreenWrapper>
    );
}

WorkspaceNewTaxPage.displayName = 'WorkspaceNewTaxPage';

export default WorkspaceNewTaxPage;

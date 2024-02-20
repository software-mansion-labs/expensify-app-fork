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
import * as Policy from '@userActions/Policy';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {WorkspaceTax} from '@src/types/onyx';

type ValuePageOnyxProps = {
    workspaceTax: OnyxEntry<WorkspaceTax>;
};

type ValuePageProps = ValuePageOnyxProps & {
    route: {
        params: {
            policyID: string;
            taxName: string;
        };
    };
};

function ValuePage({
    route: {
        params: {policyID, taxName},
    },
    workspaceTax,
}: ValuePageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [value, setValue] = useState(workspaceTax?.value?.toString());

    const submit = () => {
        Policy.setTaxValue(Number(value));
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
})(ValuePage);

import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TaxPicker from '@components/TaxPicker';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {setWorkspaceCurrencyDefault} from '@libs/actions/TaxRate';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import type SCREENS from '@src/SCREENS';

type WorkspaceTaxesSettingsWorkspaceCurrencyProps = WithPolicyAndFullscreenLoadingProps &
    StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_WORKSPACE_CURRENCY_DEFAULT>;

function WorkspaceTaxesSettingsWorkspaceCurrency({
    route: {
        params: {policyID},
    },
    policy,
}: WorkspaceTaxesSettingsWorkspaceCurrencyProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const defaultTaxName =
        (policy?.taxRates?.defaultExternalID &&
            `${policy?.taxRates.taxes[policy?.taxRates?.defaultExternalID].name} (${policy?.taxRates.taxes[policy?.taxRates?.defaultExternalID].value}) • ${translate('common.default')}`) ??
        '';
    const submit = ({keyForList}: {keyForList: string}) => {
        Navigation.goBack();
        setWorkspaceCurrencyDefault({policyID, defaultExternalID: keyForList});
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={WorkspaceTaxesSettingsWorkspaceCurrency.displayName}
        >
            {({insets}) => (
                <>
                    <HeaderWithBackButton title={translate('workspace.taxes.settings.workspaceCurrencyDefault')} />

                    <View style={styles.mb4}>
                        <TaxPicker
                            selectedTaxRate={defaultTaxName}
                            taxRates={policy?.taxRates}
                            insets={insets}
                            onSubmit={submit}
                        />
                    </View>
                </>
            )}
        </ScreenWrapper>
    );
}

WorkspaceTaxesSettingsWorkspaceCurrency.displayName = 'WorkspaceTaxesSettingsWorkspaceCurrency';

export default withPolicyAndFullscreenLoading(WorkspaceTaxesSettingsWorkspaceCurrency);

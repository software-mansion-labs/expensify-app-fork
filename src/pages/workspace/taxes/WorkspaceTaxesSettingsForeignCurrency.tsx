import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TaxPicker from '@components/TaxPicker';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {setForeignCurrencyDefault} from '@libs/actions/TaxRate';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import type SCREENS from '@src/SCREENS';

type WorkspaceTaxesSettingsForeignCurrencyProps = WithPolicyAndFullscreenLoadingProps &
    StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT>;

function WorkspaceTaxesSettingsForeignCurrency({
    route: {
        params: {policyID},
    },
    policy,
}: WorkspaceTaxesSettingsForeignCurrencyProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const defaultTaxName =
        (policy?.taxRates?.foreignTaxDefault && `${policy.taxRates.taxes[policy.taxRates?.foreignTaxDefault].name} (${policy.taxRates.taxes[policy.taxRates?.foreignTaxDefault].value})`) ??
        '';
    const submit = ({keyForList}: {keyForList: string}) => {
        Navigation.goBack();
        setForeignCurrencyDefault({policyID, foreignTaxDefault: keyForList});
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={WorkspaceTaxesSettingsForeignCurrency.displayName}
        >
            {({insets}) => (
                <>
                    <HeaderWithBackButton title={translate('workspace.taxes.settings.foreignCurrencyDefault')} />

                    <View style={styles.mb4}>
                        <TaxPicker
                            selectedTaxRate={defaultTaxName}
                            taxRates={policy.taxRates}
                            insets={insets}
                            onSubmit={submit}
                        />
                    </View>
                </>
            )}
        </ScreenWrapper>
    );
}

WorkspaceTaxesSettingsForeignCurrency.displayName = 'WorkspaceTaxesSettingsForeignCurrency';

export default withPolicyAndFullscreenLoading(WorkspaceTaxesSettingsForeignCurrency);

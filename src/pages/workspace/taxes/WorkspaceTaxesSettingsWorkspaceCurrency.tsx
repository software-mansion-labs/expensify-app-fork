import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TaxPicker from '@components/TaxPicker';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {setWorkspaceCurrencyDefault} from '@libs/actions/TaxRate';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type WorkspaceTaxesSettingsWorkspaceCurrencyOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.TaxRatesWithDefault>;
};

type WorkspaceTaxesSettingsWorkspaceCurrencyProps = WorkspaceTaxesSettingsWorkspaceCurrencyOnyxProps &
    StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_WORKSPACE_CURRENCY_DEFAULT>;

function WorkspaceTaxesSettingsWorkspaceCurrency({
    route: {
        params: {policyID},
    },
    policyTaxRates,
}: WorkspaceTaxesSettingsWorkspaceCurrencyProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const defaultTaxName =
        (policyTaxRates?.defaultExternalID &&
            `${policyTaxRates.taxes[policyTaxRates?.defaultExternalID].name} (${policyTaxRates.taxes[policyTaxRates?.defaultExternalID].value}) • ${translate('common.default')}`) ??
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
                            taxRates={policyTaxRates}
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

export default withOnyx<WorkspaceTaxesSettingsWorkspaceCurrencyProps, WorkspaceTaxesSettingsWorkspaceCurrencyOnyxProps>({
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route?.params?.policyID || ''}`,
    },
})(WorkspaceTaxesSettingsWorkspaceCurrency);

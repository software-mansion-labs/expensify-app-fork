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
import {setForeignCurrencyDefault} from '@libs/actions/TaxRate';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type WorkspaceTaxesSettingsForeignCurrencyOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.TaxRatesWithDefault>;
};

type WorkspaceTaxesSettingsForeignCurrencyProps = WorkspaceTaxesSettingsForeignCurrencyOnyxProps &
    StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT>;

function WorkspaceTaxesSettingsForeignCurrency({
    route: {
        params: {policyID},
    },
    policyTaxRates,
}: WorkspaceTaxesSettingsForeignCurrencyProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const defaultTaxName =
        (policyTaxRates?.foreignTaxDefault && `${policyTaxRates.taxes[policyTaxRates?.foreignTaxDefault].name} (${policyTaxRates.taxes[policyTaxRates?.foreignTaxDefault].value})`) ?? '';
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

WorkspaceTaxesSettingsForeignCurrency.displayName = 'WorkspaceTaxesSettingsForeignCurrency';

export default withOnyx<WorkspaceTaxesSettingsForeignCurrencyProps, WorkspaceTaxesSettingsForeignCurrencyOnyxProps>({
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route?.params?.policyID || ''}`,
    },
})(WorkspaceTaxesSettingsForeignCurrency);

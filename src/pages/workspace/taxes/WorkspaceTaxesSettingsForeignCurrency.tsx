import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import useLocalize from '@hooks/useLocalize';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import type SCREENS from '@src/SCREENS';
import BaseSettingsTaxSelector from './BaseSettingsTaxSelector';

type WorkspaceTaxesSettingsForeignCurrencyProps = StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT>;

function WorkspaceTaxesSettingsForeignCurrency({
    route: {
        params: {policyID},
    },
}: WorkspaceTaxesSettingsForeignCurrencyProps) {
    const {translate} = useLocalize();

    return (
        <BaseSettingsTaxSelector
            title={translate('workspace.taxes.settings.foreignCurrencyDefault')}
            policyID={policyID}
            onTaxSelect={(tax) => console.log('Foreign', {tax})}
        />
    );
}

WorkspaceTaxesSettingsForeignCurrency.displayName = 'WorkspaceTaxesSettingsForeignCurrency';

export default WorkspaceTaxesSettingsForeignCurrency;

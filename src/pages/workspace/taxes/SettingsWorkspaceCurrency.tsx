import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import useLocalize from '@hooks/useLocalize';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import type SCREENS from '@src/SCREENS';
import BaseSettingsTaxSelector from './BaseSettingsTaxSelector';

type SettingsWorkspaceCurrencyProps = StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT>;

function SettingsWorkspaceCurrency({
    route: {
        params: {policyID},
    },
}: SettingsWorkspaceCurrencyProps) {
    const {translate} = useLocalize();

    return (
        <BaseSettingsTaxSelector
            title={translate('workspace.taxes.settings.workspaceCurrencyDefault')}
            policyID={policyID}
            onTaxSelect={(tax) => console.log('Workspace', {tax})}
        />
    );
}

SettingsWorkspaceCurrency.displayName = 'SettingsWorkspaceCurrency';

export default SettingsWorkspaceCurrency;

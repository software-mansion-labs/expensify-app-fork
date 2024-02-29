import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import useLocalize from '@hooks/useLocalize';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import type SCREENS from '@src/SCREENS';
import BaseSettingsTaxSelector from './BaseSettingsTaxSelector';

type WorkspaceTaxesSettingsWorkspaceCurrencyProps = StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT>;

function WorkspaceTaxesSettingsWorkspaceCurrency({
    route: {
        params: {policyID},
    },
}: WorkspaceTaxesSettingsWorkspaceCurrencyProps) {
    const {translate} = useLocalize();

    return (
        <BaseSettingsTaxSelector
            title={translate('workspace.taxes.settings.workspaceCurrencyDefault')}
            policyID={policyID}
            onTaxSelect={(tax) => console.log('Workspace', {tax})}
        />
    );
}

WorkspaceTaxesSettingsWorkspaceCurrency.displayName = 'WorkspaceTaxesSettingsWorkspaceCurrency';

export default WorkspaceTaxesSettingsWorkspaceCurrency;

import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {ScrollView, View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type WorkspaceTaxesSettingsPageProps = WithPolicyAndFullscreenLoadingProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS>;

function WorkspaceTaxesSettingsPage({
    route: {
        params: {policyID},
    },
    policy,
}: WorkspaceTaxesSettingsPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const menuItems = [
        {
            title: policy?.taxRates?.name,
            description: translate('workspace.taxes.settings.customTaxName'),
            action: () => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_CUSTOM_TAX_NAME.getRoute(policyID)),
        },
        {
            title: policy?.taxRates?.taxes[policy?.taxRates?.defaultExternalID]?.name,
            description: translate('workspace.taxes.settings.workspaceCurrencyDefault'),
            action: () => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_WORKSPACE_CURRENCY_DEFAULT.getRoute(policyID)),
        },
        {
            title: policy?.taxRates?.taxes[policy?.taxRates?.foreignTaxDefault]?.name,
            description: translate('workspace.taxes.settings.foreignCurrencyDefault'),
            action: () => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT.getRoute(policyID)),
        },
    ];

    return (
        <ScrollView contentContainerStyle={styles.flexGrow1}>
            <HeaderWithBackButton title={translate('common.settings')} />
            <View style={styles.flex1}>
                {menuItems.map((item) => (
                    <MenuItemWithTopDescription
                        key={item.description}
                        shouldShowRightIcon
                        title={item.title}
                        description={item.description}
                        style={[styles.moneyRequestMenuItem]}
                        titleStyle={styles.flex1}
                        onPress={item.action}
                    />
                ))}
            </View>
        </ScrollView>
    );
}

export default withPolicyAndFullscreenLoading(WorkspaceTaxesSettingsPage);

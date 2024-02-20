import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {ScrollView, View} from 'react-native';
import FormAlertWithSubmitButton from '@components/FormAlertWithSubmitButton';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type Props = StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS>;

function WorkspaceTaxesSettingsPage({
    route: {
        params: {policyID},
    },
}: Props) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    return (
        <ScrollView contentContainerStyle={styles.flexGrow1}>
            <HeaderWithBackButton title={translate('common.settings')} />
            <View style={styles.flex1}>
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title=""
                    description={translate('workspace.taxes.settings.customTaxName')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                    onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_CUSTOM_TAX_NAME.getRoute(policyID))}
                />
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title=""
                    description={translate('workspace.taxes.settings.workspaceCurrencyDefault')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                    onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_WORKSPACE_CURRENCY_DEFAULT.getRoute(policyID))}
                />
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title=""
                    description={translate('workspace.taxes.settings.foreignCurrencyDefault')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                    onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT.getRoute(policyID))}
                />
            </View>
        </ScrollView>
    );
}

export default WorkspaceTaxesSettingsPage;

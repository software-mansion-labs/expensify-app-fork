import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {ScrollView, View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {withOnyx} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type WorkspaceTaxesPageOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.TaxRatesWithDefault>;
};

type WorkspaceTaxesSettingsPageProps = WithPolicyAndFullscreenLoadingProps &
    WorkspaceTaxesPageOnyxProps &
    StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS>;

function WorkspaceTaxesSettingsPage({
    route: {
        params: {policyID},
    },
    policyTaxRates,
}: WorkspaceTaxesSettingsPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    return (
        <ScrollView contentContainerStyle={styles.flexGrow1}>
            <HeaderWithBackButton title={translate('common.settings')} />
            <View style={styles.flex1}>
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title={policyTaxRates?.name}
                    description={translate('workspace.taxes.settings.customTaxName')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                    onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_CUSTOM_TAX_NAME.getRoute(policyID))}
                />
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title={policyTaxRates?.defaultExternalID}
                    description={translate('workspace.taxes.settings.workspaceCurrencyDefault')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                    onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_WORKSPACE_CURRENCY_DEFAULT.getRoute(policyID))}
                />
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title={policyTaxRates?.foreignTaxDefault}
                    description={translate('workspace.taxes.settings.foreignCurrencyDefault')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                    onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT.getRoute(policyID))}
                />
            </View>
        </ScrollView>
    );
}

export default withPolicyAndFullscreenLoading(
    withOnyx<WorkspaceTaxesSettingsPageProps, WorkspaceTaxesPageOnyxProps>({
        policyTaxRates: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route.params.policyID}`,
        },
    })(WorkspaceTaxesSettingsPage),
);

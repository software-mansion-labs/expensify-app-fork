import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {withOnyx} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import Switch from '@components/Switch';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import compose from '@libs/compose';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import * as PolicyUtils from '@libs/PolicyUtils';
import type {WithPolicyProps} from '@pages/workspace/withPolicy';
import withPolicy from '@pages/workspace/withPolicy';
import * as Policy from '@userActions/Policy';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type WorkspaceTaxesEditPageOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.PolicyTaxRateWithDefault>;
};

type WorkspaceTaxesEditPageBaseProps = WithPolicyProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_EDIT_VALUE>;

type WorkspaceTaxesEditPageProps = WorkspaceTaxesEditPageBaseProps & WorkspaceTaxesEditPageOnyxProps;

function WorkspaceTaxesEditPage({
    route: {
        params: {policyID, taxName},
    },
    policyTaxRates,
}: WorkspaceTaxesEditPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const currentTaxRate = PolicyUtils.getTaxByID(policyTaxRates, taxName);

    const title = currentTaxRate?.name ?? 'New rate';

    return (
        <View>
            <HeaderWithBackButton title={title} />
            <View style={[styles.flexRow, styles.mv4, styles.justifyContentBetween, styles.ph5]}>
                <View style={styles.flex4}>
                    <Text>Enable rate</Text>
                </View>
                <View style={[styles.flex1, styles.alignItemsEnd]}>
                    <Switch
                        accessibilityLabel="TODO"
                        isOn={!currentTaxRate?.isDisabled}
                        onToggle={() => {}}
                    />
                </View>
            </View>
            <MenuItemWithTopDescription
                shouldShowRightIcon
                title={currentTaxRate?.name}
                description={translate('workspace.taxes.name')}
                style={[styles.moneyRequestMenuItem]}
                titleStyle={styles.flex1}
                onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_EDIT_NAME.getRoute(`${policyID}`, taxName))}
            />
            <MenuItemWithTopDescription
                shouldShowRightIcon
                title={currentTaxRate?.value}
                description={translate('workspace.taxes.value')}
                style={[styles.moneyRequestMenuItem]}
                titleStyle={styles.flex1}
                onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_EDIT_VALUE.getRoute(`${policyID}`, taxName))}
            />
        </View>
    );
}

WorkspaceTaxesEditPage.displayName = 'WorkspaceTaxesEditPage';

export default compose(
    withOnyx<WorkspaceTaxesEditPageProps, WorkspaceTaxesEditPageOnyxProps>({
        policyTaxRates: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATE}${route.params.policyID}`,
        },
    }),
    withPolicy,
)(WorkspaceTaxesEditPage);

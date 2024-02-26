import type {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {withOnyx} from 'react-native-onyx';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScreenWrapper from '@components/ScreenWrapper';
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
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type WorkspaceTaxPageOnyxProps = {
    workspaceTax: OnyxEntry<OnyxTypes.WorkspaceTax>;
    policyTaxRates: OnyxEntry<OnyxTypes.PolicyTaxRateWithDefault>;
};

type WorkspaceTaxPageBaseProps = WithPolicyProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_VALUE>;

type WorkspaceTaxPageProps = WorkspaceTaxPageBaseProps & WorkspaceTaxPageOnyxProps;

function WorkspaceTaxPage({
    route: {
        params: {policyID, taxName},
    },
    workspaceTax,
    policyTaxRates,
}: WorkspaceTaxPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const currentTaxRate = PolicyUtils.getTaxByID(policyTaxRates, taxName);

    const isEditPage = !!currentTaxRate?.name;

    const title = isEditPage ? currentTaxRate?.name : 'New rate';

    return (
        <ScreenWrapper
            testID={WorkspaceTaxPage.displayName}
            style={styles.mb5}
        >
            <View style={[styles.h100, styles.flex1, styles.justifyContentBetween]}>
                <View>
                    <HeaderWithBackButton title={title} />
                    {taxName ? (
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
                    ) : null}
                    <MenuItemWithTopDescription
                        shouldShowRightIcon
                        title={isEditPage ? currentTaxRate?.name : workspaceTax?.name}
                        description={translate('workspace.taxes.name')}
                        style={[styles.moneyRequestMenuItem]}
                        titleStyle={styles.flex1}
                        rightLabel={!isEditPage ? translate('common.required') : undefined}
                        onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_NAME.getRoute(`${policyID}`, taxName))}
                    />
                    <MenuItemWithTopDescription
                        shouldShowRightIcon
                        title={`${isEditPage ? currentTaxRate?.value : workspaceTax?.value}%`}
                        description={translate('workspace.taxes.value')}
                        style={[styles.moneyRequestMenuItem]}
                        titleStyle={styles.flex1}
                        rightLabel={!isEditPage ? translate('common.required') : undefined}
                        onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_VALUE.getRoute(`${policyID}`, taxName))}
                    />
                </View>
                {!isEditPage ? (
                    <Button
                        success
                        text={translate('common.save')}
                        // Add api call here to add new rate - use workspaceTax as the source of data and clear it at the end
                        onPress={() => {}}
                    />
                ) : null}
            </View>
        </ScreenWrapper>
    );
}

WorkspaceTaxPage.displayName = 'WorkspaceTaxPage';

export default compose(
    withOnyx<WorkspaceTaxPageProps, WorkspaceTaxPageOnyxProps>({
        workspaceTax: {
            key: ONYXKEYS.WORKSPACE_TAX,
        },
        policyTaxRates: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route.params?.policyID}`,
        },
    }),
    withPolicy,
)(WorkspaceTaxPage);

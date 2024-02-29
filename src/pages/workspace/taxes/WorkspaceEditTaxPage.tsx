import type {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {withOnyx} from 'react-native-onyx';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import * as Expensicons from '@components/Icon/Expensicons';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScreenWrapper from '@components/ScreenWrapper';
import Switch from '@components/Switch';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import compose from '@libs/compose';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import * as PolicyUtils from '@libs/PolicyUtils';
import type {WithPolicyProps} from '@pages/workspace/withPolicy';
import withPolicy from '@pages/workspace/withPolicy';
import {setWorkspaceTaxesDisabled} from '@userActions/TaxRate';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type WorkspaceEditTaxPageOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.TaxRatesWithDefault>;
};

type WorkspaceEditTaxPageBaseProps = WithPolicyProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_EDIT>;

type WorkspaceEditTaxPageProps = WorkspaceEditTaxPageBaseProps & WorkspaceEditTaxPageOnyxProps;

function WorkspaceEditTaxPage({
    route: {
        params: {policyID, taxID},
    },
    policyTaxRates,
}: WorkspaceEditTaxPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const currentTaxRate = PolicyUtils.getTaxByID(policyTaxRates, taxID);
    const {windowWidth} = useWindowDimensions();
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    const toggle = () => {
        setWorkspaceTaxesDisabled({
            policyID,
            taxesToUpdate: {
                [taxID]: {
                    isDisabled: !currentTaxRate?.isDisabled,
                },
            },
        });
    };

    const deleteTax = () => {
        // TODO: Call Onyx action to delete tax
        setIsDeleteModalVisible(false);
    };

    const threeDotsMenuItems = useMemo(() => {
        const menuItems = [
            {
                icon: Expensicons.Trashcan,
                text: translate('common.delete'),
                onSelected: () => setIsDeleteModalVisible(true),
            },
        ];
        return menuItems;
    }, [translate]);

    return (
        <ScreenWrapper
            testID={WorkspaceEditTaxPage.displayName}
            style={styles.mb5}
        >
            <View style={[styles.h100, styles.flex1, styles.justifyContentBetween]}>
                <View>
                    <HeaderWithBackButton
                        title={currentTaxRate?.name}
                        threeDotsMenuItems={threeDotsMenuItems}
                        shouldShowThreeDotsButton
                        threeDotsAnchorPosition={styles.threeDotsPopoverOffsetNoCloseButton(windowWidth)}
                    />
                    {taxID ? (
                        // TODO: Extract it to a separate component or use a common one
                        <View style={[styles.flexRow, styles.mv4, styles.justifyContentBetween, styles.ph5]}>
                            <View style={styles.flex4}>
                                <Text>Enable rate</Text>
                            </View>
                            <View style={[styles.flex1, styles.alignItemsEnd]}>
                                <Switch
                                    accessibilityLabel="TODO"
                                    isOn={!currentTaxRate?.isDisabled}
                                    onToggle={toggle}
                                />
                            </View>
                        </View>
                    ) : null}
                    <MenuItemWithTopDescription
                        shouldShowRightIcon
                        title={currentTaxRate?.name}
                        description={translate('workspace.taxes.name')}
                        style={[styles.moneyRequestMenuItem]}
                        titleStyle={styles.flex1}
                        onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_NAME.getRoute(`${policyID}`, taxID))}
                    />
                    <MenuItemWithTopDescription
                        shouldShowRightIcon
                        title={currentTaxRate?.value}
                        description={translate('workspace.taxes.value')}
                        style={[styles.moneyRequestMenuItem]}
                        titleStyle={styles.flex1}
                        onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_VALUE.getRoute(`${policyID}`, taxID))}
                    />
                </View>
            </View>
            <ConfirmModal
                title={translate('workspace.taxes.deleteTax')}
                isVisible={isDeleteModalVisible}
                onConfirm={deleteTax}
                onCancel={() => setIsDeleteModalVisible(false)}
                prompt={translate('workspace.taxes.deleteTaxConfirmation')}
                confirmText={translate('common.delete')}
                cancelText={translate('common.cancel')}
                danger
            />
        </ScreenWrapper>
    );
}

WorkspaceEditTaxPage.displayName = 'WorkspaceEditTaxPage';

export default compose(
    withOnyx<WorkspaceEditTaxPageProps, WorkspaceEditTaxPageOnyxProps>({
        policyTaxRates: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route.params?.policyID}`,
        },
    }),
    withPolicy,
)(WorkspaceEditTaxPage);

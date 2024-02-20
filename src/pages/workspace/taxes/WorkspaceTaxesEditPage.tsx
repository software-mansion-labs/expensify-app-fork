import React from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {withOnyx} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import Switch from '@components/Switch';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import compose from '@libs/compose';
import Navigation from '@libs/Navigation/Navigation';
import type {WithPolicyProps} from '@pages/workspace/withPolicy';
import withPolicy from '@pages/workspace/withPolicy';
import * as Policy from '@userActions/Policy';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {WorkspaceTax} from '@src/types/onyx';

type WorkspaceTaxesEditPageOnyxProps = {
    workspaceTax: OnyxEntry<WorkspaceTax>;
};

type WorkspaceTaxesEditPageBaseProps = WithPolicyProps & {
    route: {
        params: {
            policyID: string;
            taxName: string;
        };
    };
};

type WorkspaceTaxesEditPageProps = WorkspaceTaxesEditPageBaseProps & WorkspaceTaxesEditPageOnyxProps;

function WorkspaceTaxesEditPage({
    route: {
        params: {policyID, taxName},
    },
    workspaceTax,
}: WorkspaceTaxesEditPageProps) {
    const styles = useThemeStyles();

    return (
        <View>
            <HeaderWithBackButton title={workspaceTax?.name} />
            <View style={[styles.flexRow, styles.mb4, styles.justifyContentBetween, styles.sectionMenuItemTopDescription]}>
                <View style={styles.flex4}>
                    <Text>Enable rate</Text>
                </View>
                <View style={[styles.flex1, styles.alignItemsEnd]}>
                    <Switch
                        accessibilityLabel="TODO"
                        isOn={!!workspaceTax?.enabled}
                        onToggle={() => Policy.setTaxEnabled(!workspaceTax?.enabled)}
                    />
                </View>
            </View>
            <MenuItemWithTopDescription
                shouldShowRightIcon
                title={workspaceTax?.name}
                description="Name"
                style={[styles.moneyRequestMenuItem]}
                titleStyle={styles.flex1}
                onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_EDIT_NAME.getRoute(`${policyID}`, taxName))}
            />
            <MenuItemWithTopDescription
                shouldShowRightIcon
                title={workspaceTax?.value?.toString()}
                description="Value"
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
        workspaceTax: {
            key: ONYXKEYS.WORKSPACE_TAX_EDIT,
        },
    }),
    withPolicy,
)(WorkspaceTaxesEditPage);

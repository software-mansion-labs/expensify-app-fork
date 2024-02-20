import React from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import Switch from '@components/Switch';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import * as Policy from '@userActions/Policy';

type Props = {
    route: {
        params: {
            policyID: number;
            taxName: string;
        };
    };
};

function WorkspaceTaxesSettingsPage({
    route: {
        params: {taxName},
    },
}: Props) {
    const styles = useThemeStyles();
    return (
        <View>
            <HeaderWithBackButton title={taxName} />
            <View style={[styles.flexRow, styles.mb4, styles.justifyContentBetween, styles.sectionMenuItemTopDescription]}>
                <View style={styles.flex4}>
                    <Text>Enable rate</Text>
                </View>
                <View style={[styles.flex1, styles.alignItemsEnd]}>
                    <Switch
                        accessibilityLabel="TODO"
                        isOn={false}
                        onToggle={() => {
                            console.log('switched');
                            Policy.setTaxName('test');
                        }}
                    />
                </View>
            </View>
            <MenuItemWithTopDescription
                shouldShowRightIcon
                title={taxName}
                description="Name"
                style={[styles.moneyRequestMenuItem]}
                titleStyle={styles.flex1}
            />
            <MenuItemWithTopDescription
                shouldShowRightIcon
                title={taxName}
                description="Value"
                style={[styles.moneyRequestMenuItem]}
                titleStyle={styles.flex1}
            />
        </View>
    );
}

export default WorkspaceTaxesSettingsPage;

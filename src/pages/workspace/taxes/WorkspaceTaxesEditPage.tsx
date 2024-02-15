import React from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import Switch from '@components/Switch';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';

type Props = {
    route: {
        params: {
            policyID: number;
            taxID: string;
        };
    };
};

function WorkspaceTaxesSettingsPage({
    route: {
        params: {taxID},
    },
}: Props) {
    const styles = useThemeStyles();
    return (
        <View>
            <HeaderWithBackButton title={taxID} />
            <View style={[styles.flexRow, styles.mb4, styles.justifyContentBetween, styles.sectionMenuItemTopDescription]}>
                <View style={styles.flex4}>
                    <Text>Enable rate</Text>
                </View>
                <View style={[styles.flex1, styles.alignItemsEnd]}>
                    <Switch
                        accessibilityLabel="TODO"
                        isOn={false}
                        onToggle={() => {}}
                    />
                </View>
            </View>
            <MenuItemWithTopDescription
                shouldShowRightIcon
                title={taxID}
                description="Name"
                style={[styles.moneyRequestMenuItem]}
                titleStyle={styles.flex1}
            />
            <MenuItemWithTopDescription
                shouldShowRightIcon
                title={taxID}
                description="Value"
                style={[styles.moneyRequestMenuItem]}
                titleStyle={styles.flex1}
            />
        </View>
    );
}

export default WorkspaceTaxesSettingsPage;

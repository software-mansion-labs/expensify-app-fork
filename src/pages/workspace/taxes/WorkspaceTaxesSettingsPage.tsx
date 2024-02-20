import React from 'react';
import {ScrollView, View} from 'react-native';
import FormAlertWithSubmitButton from '@components/FormAlertWithSubmitButton';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import Switch from '@components/Switch';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

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
    const {translate} = useLocalize();
    return (
        <ScrollView contentContainerStyle={styles.flexGrow1}>
            <HeaderWithBackButton title={translate('common.settings')} />
            <View style={styles.flex1}>
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title={taxName}
                    description={translate('workspace.taxes.settings.customTaxName')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                />
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title={taxName}
                    description={translate('workspace.taxes.settings.workspaceCurrencyDefault')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                />
                <MenuItemWithTopDescription
                    shouldShowRightIcon
                    title={taxName}
                    description={translate('workspace.taxes.settings.foreignCurrencyDefault')}
                    style={[styles.moneyRequestMenuItem]}
                    titleStyle={styles.flex1}
                />
            </View>
            <View style={[styles.flexShrink0]}>
                <FormAlertWithSubmitButton
                    onSubmit={() => {}}
                    enabledWhenOffline
                    buttonText={translate('common.save')}
                    containerStyles={[styles.mh0, styles.mt5, styles.flex1, styles.ph5]}
                    isAlertVisible={false}
                />
            </View>
        </ScrollView>
    );
}

export default WorkspaceTaxesSettingsPage;

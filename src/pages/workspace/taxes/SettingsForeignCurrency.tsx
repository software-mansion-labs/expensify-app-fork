import type {StackScreenProps} from '@react-navigation/stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import FormProvider from '@components/Form/FormProvider';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import RadioListItem from '@components/SelectionList/RadioListItem';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type SettingsForeignCurrencyOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.TaxRatesWithDefault>;
};

type SettingsForeignCurrencyProps = SettingsForeignCurrencyOnyxProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT>;

type SettingsForeignCurrencyPageSectionItem = {
    text: string;
    keyForList: string;
    isSelected: boolean;
};

function SettingsForeignCurrency({
    route: {
        params: {policyID},
    },
    policyTaxRates,
}: SettingsForeignCurrencyProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [searchText, setSearchText] = useState('');

    const submit = () => {
        Navigation.goBack(ROUTES.WORKSPACE_TAXES_SETTINGS.getRoute(policyID ?? ''));
    };

    let initiallyFocusedOptionKey;
    const taxItems: SettingsForeignCurrencyPageSectionItem[] = Object.entries(policyTaxRates?.taxes ?? {}).map(([taxId, taxRate]) => {
        const isSelected = taxId === policyTaxRates?.foreignTaxDefault;

        if (isSelected) {
            initiallyFocusedOptionKey = taxId;
        }

        return {
            text: `${taxRate.name} - ${taxRate.value}`,
            keyForList: taxId,
            isSelected,
        };
    });

    const headerMessage = searchText.trim() && !taxItems.length ? translate('common.noResultsFound') : '';

    const sections = [{data: taxItems, indexOffset: 0}];

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={SettingsForeignCurrency.displayName}
        >
            <HeaderWithBackButton title={translate('workspace.taxes.settings.customTaxName')} />

            <FormProvider
                formID={ONYXKEYS.FORMS.WORKSPACE_TAX_CUSTOM_NAME}
                submitButtonText={translate('workspace.editor.save')}
                style={[styles.flexGrow1]}
                scrollContextEnabled
                onSubmit={submit}
            >
                <View style={styles.mb4}>
                    <SelectionList
                        sections={sections}
                        ListItem={RadioListItem}
                        textInputLabel="Select tax rate"
                        textInputValue={searchText}
                        onChangeText={setSearchText}
                        onSelectRow={() => {}}
                        headerMessage={headerMessage}
                        initiallyFocusedOptionKey={initiallyFocusedOptionKey}
                        showScrollIndicator
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

SettingsForeignCurrency.displayName = 'SettingsForeignCurrency';

export default withOnyx<SettingsForeignCurrencyProps, SettingsForeignCurrencyOnyxProps>({
    policyTaxRates: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${route.params.policyID}`,
    },
})(SettingsForeignCurrency);

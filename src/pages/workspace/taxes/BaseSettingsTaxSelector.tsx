import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import RadioListItem from '@components/SelectionList/RadioListItem';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';

type BaseSettingsTaxSelectorOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.TaxRatesWithDefault>;
};

type BaseSettingsTaxSelectorProps = BaseSettingsTaxSelectorOnyxProps & {
    title: string;
    onTaxSelect?: (taxId: string) => void;

    // eslint-disable-next-line react/no-unused-prop-types
    policyID: string;
};

type BaseSettingsTaxSelectorPageSectionItem = {
    text: string;
    keyForList: string;
    isSelected: boolean;
    taxId: string;
};

function BaseSettingsTaxSelector({title, policyTaxRates, onTaxSelect}: BaseSettingsTaxSelectorProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [searchText, setSearchText] = useState('');

    let initiallyFocusedOptionKey;
    const taxItems: BaseSettingsTaxSelectorPageSectionItem[] = useMemo(
        () =>
            Object.entries(policyTaxRates?.taxes ?? {}).map(([taxId, taxRate]) => {
                const isSelected = taxId === policyTaxRates?.foreignTaxDefault;

                if (isSelected) {
                    initiallyFocusedOptionKey = taxId;
                }

                return {
                    text: `${taxRate.name} - ${taxRate.value}`,
                    keyForList: taxId,
                    isSelected,
                    taxId,
                };
            }),
        [policyTaxRates],
    );

    const headerMessage = searchText.trim() && !taxItems.length ? translate('common.noResultsFound') : '';

    const sections = [{data: taxItems, indexOffset: 0}];

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={BaseSettingsTaxSelector.displayName}
        >
            <HeaderWithBackButton title={title} />

            <View style={styles.mb4}>
                <SelectionList
                    sections={sections}
                    ListItem={RadioListItem}
                    textInputLabel="Select tax rate"
                    textInputValue={searchText}
                    onChangeText={setSearchText}
                    onSelectRow={({taxId}) => {
                        Navigation.goBack();
                        onTaxSelect(taxId);
                    }}
                    headerMessage={headerMessage}
                    initiallyFocusedOptionKey={initiallyFocusedOptionKey}
                    showScrollIndicator
                />
            </View>
        </ScreenWrapper>
    );
}

BaseSettingsTaxSelector.displayName = 'BaseSettingsTaxSelector';

export default withOnyx<BaseSettingsTaxSelectorProps, BaseSettingsTaxSelectorOnyxProps>({
    policyTaxRates: {
        key: ({policyID}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATES}${policyID}`,
    },
})(BaseSettingsTaxSelector);

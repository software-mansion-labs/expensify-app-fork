import type {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import ButtonWithDropdownMenu from '@components/ButtonWithDropdownMenu';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import TableListItem from '@components/SelectionList/TableListItem';
import type {ListItem} from '@components/SelectionList/types';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import Navigation from '@libs/Navigation/Navigation';
import type {CentralPaneNavigatorParamList} from '@libs/Navigation/types';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type WorkspaceTaxesPageProps = WithPolicyAndFullscreenLoadingProps & StackScreenProps<CentralPaneNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES>;

function WorkspaceTaxesPage({policy}: WorkspaceTaxesPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const {isSmallScreenWidth} = useWindowDimensions();
    const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);

    const taxesList = useMemo<ListItem[]>(
        () =>
            Object.entries(policy?.taxRates?.taxes ?? {}).map(([key, value]) => ({
                // TODO: Clean up: check if all properties are needed
                text: value.name,
                keyForList: key,
                isSelected: selectedTaxes.includes(key),
                pendingAction: value.pendingAction,
                rightElement: (
                    // TODO: Extract this into a separate component together with WorkspaceCategoriesPage
                    <View style={styles.flexRow}>
                        <Text style={[styles.disabledText, styles.alignSelfCenter]}>{value.isDisabled ? translate('workspace.common.disabled') : translate('workspace.common.enabled')}</Text>
                        <View style={styles.p1}>
                            <Icon
                                src={Expensicons.ArrowRight}
                                fill={theme.icon}
                            />
                        </View>
                    </View>
                ),
            })),
        [policy?.taxRates?.taxes, selectedTaxes, styles.alignSelfCenter, styles.disabledText, styles.flexRow, styles.p1, theme.icon, translate],
    );

    // const toggleTax = (tax: TaxForList) => {
    //     setSelectedTaxes((prev) => {
    //         if (prev.includes(tax.value)) {
    //             return prev.filter((item) => item !== tax.value);
    //         }
    //         return [...prev, tax.value];
    //     });
    // };

    const toggleAllTaxes = () => {
        const isAllSelected = taxesList.every((tax) => tax.isSelected);
        if (isAllSelected) {
            setSelectedTaxes([]);
        } else {
            setSelectedTaxes(taxesList.map((item) => item.keyForList));
        }
    };

    const dropdownMenuOptions = useMemo(
        () => [
            {
                icon: Expensicons.Trashcan,
                text: translate('workspace.taxes.deleteTaxes'),
                value: CONST.TAX_RATES.ACTION_TYPE.DELETE,
            },

            {
                icon: Expensicons.Document,
                text: translate('workspace.taxes.disableTaxes'),
                value: CONST.TAX_RATES.ACTION_TYPE.DISABLE,
            },

            {
                icon: Expensicons.Document,
                text: translate('workspace.taxes.enableTaxes'),
                value: CONST.TAX_RATES.ACTION_TYPE.ENABLE,
            },
        ],
        [translate],
    );

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            testID={WorkspaceTaxesPage.displayName}
            shouldShowOfflineIndicatorInWideScreen
        >
            <HeaderWithBackButton
                title={translate('workspace.common.taxes')}
                icon={Illustrations.Coins}
                shouldShowBackButton={isSmallScreenWidth}
            >
                {selectedTaxes.length > 0 ? (
                    <ButtonWithDropdownMenu
                        onPress={() => {}}
                        options={dropdownMenuOptions}
                        buttonSize="medium"
                        buttonLabel={`${selectedTaxes.length} selected`}
                    />
                ) : (
                    <>
                        <Button
                            medium
                            success
                            icon={Expensicons.Plus}
                            iconStyles={styles.buttonCTAIcon}
                            onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_NEW.getRoute(policy?.id ?? ''))}
                        >
                            <Text>Add rate</Text>
                        </Button>
                        <Button
                            medium
                            icon={Expensicons.Gear}
                            iconStyles={styles.buttonCTAIcon}
                            onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS.getRoute(policy?.id ?? ''))}
                        >
                            <Text>{translate('common.settings')}</Text>
                        </Button>
                    </>
                )}
            </HeaderWithBackButton>
            <SelectionList
                canSelectMultiple
                sections={[{data: taxesList, indexOffset: 0, isDisabled: false}]}
                onSelectRow={(tax: ListItem) => Navigation.navigate(ROUTES.WORKSPACE_TAXES_EDIT.getRoute(policy?.id ?? '', tax.keyForList))}
                onSelectAll={toggleAllTaxes}
                showScrollIndicator
                ListItem={TableListItem}
            />
        </ScreenWrapper>
    );
}

WorkspaceTaxesPage.displayName = 'WorkspaceTaxesPage';

export default withPolicyAndFullscreenLoading(WorkspaceTaxesPage);

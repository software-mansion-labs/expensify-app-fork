import type {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo, useRef, useState} from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import ButtonWithDropdownMenu from '@components/ButtonWithDropdownMenu';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import TableListItem from '@components/SelectionList/TableListItem';
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
import {clearTaxRateError, deleteWorkspaceTaxes} from '@src/libs/actions/TaxRate';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type WorkspaceTaxesPageProps = WithPolicyAndFullscreenLoadingProps & StackScreenProps<CentralPaneNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES>;

type TaxForList = {
    value: string;
    text: string;
    keyForList: string;
    isSelected: boolean;
    rightElement: React.ReactNode;
};

function WorkspaceTaxesPage({policy}: WorkspaceTaxesPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const {isSmallScreenWidth} = useWindowDimensions();
    const buttonRef = useRef<View>(null);
    const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    const taxesList = useMemo<TaxForList[]>(
        () =>
            Object.entries(policy?.taxRates?.taxes ?? {}).map(([key, value]) => ({
                // TODO: Clean up: check if all properties are needed
                value: value.name,
                text: value.name,
                keyForList: key,
                isSelected: !!selectedTaxes.includes(key),
                pendingAction: value.pendingAction,
                errors: value.errors,
                rightElement: (
                    // TODO: Extract this into a separate component together with WorkspaceCategoriesPage
                    <View style={styles.flexRow}>
                        <Text style={[styles.disabledText, styles.alignSelfCenter]}>{value.isDisabled ? translate('workspace.common.disabled') : translate('workspace.common.enabled')}</Text>
                        <View style={[styles.p1, styles.pl2]}>
                            <Icon
                                src={Expensicons.ArrowRight}
                                fill={theme.icon}
                            />
                        </View>
                    </View>
                ),
            })),
        [policy?.taxRates?.taxes, selectedTaxes, styles, theme.icon, translate],
    );

    const toggleTax = (tax: TaxForList) => {
        setSelectedTaxes((prev) => {
            if (prev.includes(tax.keyForList)) {
                return prev.filter((item) => item !== tax.keyForList);
            }
            return [...prev, tax.keyForList];
        });
    };

    const toggleAllTaxes = () => {
        const isAllSelected = selectedTaxes.length === taxesList.length;
        if (isAllSelected) {
            setSelectedTaxes([]);
        } else {
            setSelectedTaxes(taxesList.map((item) => item.keyForList));
        }
    };
    // TODO: may be reused from Categories and Tags
    const getCustomListHeader = () => (
        <View style={[styles.flex1, styles.flexRow, styles.justifyContentBetween, styles.pl3, styles.pr9]}>
            <Text style={styles.searchInputStyle}>{translate('common.name')}</Text>
            <Text style={[styles.searchInputStyle, styles.textAlignCenter]}>{translate('statusPage.status')}</Text>
        </View>
    );

    const deleteTaxes = () => {
        deleteWorkspaceTaxes({policyID: policy?.id ?? '', taxesToDelete: selectedTaxes});
        setIsDeleteModalVisible(false);
    };

    const dropdownMenuOptions = useMemo(
        () => [
            {
                icon: Expensicons.Trashcan,
                text: translate('workspace.taxes.deleteTaxes'),
                value: CONST.TAX_RATES.ACTION_TYPE.DELETE,
                onSelected: () => setIsDeleteModalVisible(true),
            },

            {
                // TODO: Add correct icons
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

    const headerButtons = (
        <View style={[styles.w100, styles.flexRow, isSmallScreenWidth && styles.mb3]}>
            <Button
                medium
                success
                onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_NEW.getRoute(policy?.id ?? ''))}
                icon={Expensicons.Plus}
                text="Add rate"
                style={[styles.mr3, isSmallScreenWidth && styles.w50]}
            />
            <Button
                medium
                onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS.getRoute(policy?.id ?? ''))}
                icon={Expensicons.Gear}
                text={translate('common.settings')}
                style={[isSmallScreenWidth && styles.w50]}
            />
        </View>
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
                        buttonRef={buttonRef}
                        onPress={() => {}}
                        options={dropdownMenuOptions}
                        buttonSize="medium"
                        customText={`${selectedTaxes.length} selected`}
                    />
                ) : (
                    !isSmallScreenWidth && headerButtons
                )}
            </HeaderWithBackButton>
            {isSmallScreenWidth && <View style={[styles.pl5, styles.pr5]}>{headerButtons}</View>}
            <View style={[styles.ph5, styles.pb5]}>
                <Text style={[styles.textNormal, styles.colorMuted]}>{translate('workspace.taxes.subtitle')}</Text>
            </View>
            <SelectionList
                canSelectMultiple
                sections={[{data: taxesList, indexOffset: 0, isDisabled: false}]}
                onSelectRow={(tax: TaxForList) => Navigation.navigate(ROUTES.WORKSPACE_TAXES_EDIT.getRoute(policy?.id ?? '', tax.keyForList))}
                onSelectAll={toggleAllTaxes}
                showScrollIndicator
                ListItem={TableListItem}
                onCheckboxPress={toggleTax}
                customListHeader={getCustomListHeader()}
                listHeaderWrapperStyle={[styles.ph9, styles.pv3, styles.pb5]}
                onDismissError={(tax: TaxForList) => clearTaxRateError(policy?.id ?? '', tax.keyForList)}
            />

            <ConfirmModal
                title={translate('workspace.taxes.deleteTax')}
                isVisible={isDeleteModalVisible}
                onConfirm={deleteTaxes}
                onCancel={() => setIsDeleteModalVisible(false)}
                prompt={translate('workspace.taxes.deleteTaxConfirmation')}
                confirmText={translate('common.delete')}
                cancelText={translate('common.cancel')}
                danger
            />
        </ScreenWrapper>
    );
}

WorkspaceTaxesPage.displayName = 'WorkspaceTaxesPage';

export default withPolicyAndFullscreenLoading(WorkspaceTaxesPage);

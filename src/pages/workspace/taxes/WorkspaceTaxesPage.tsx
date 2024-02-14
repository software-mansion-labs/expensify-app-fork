import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import Navigation from '@libs/Navigation/Navigation';
import type {WithPolicyOnyxProps} from '@pages/workspace/withPolicy';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import ROUTES from '@src/ROUTES';

type TaxForList = {
    value: string;
    text: string;
    keyForList: string;
    isSelected: boolean;
    rightElement: JSX.Element;
};

const taxesCategories = {
    VAT: {
        name: 'VAT',
        enabled: true,
    },
    GST: {
        name: 'GST',
        enabled: true,
    },
    SalesTax: {
        name: 'Sales Tax',
        enabled: false,
    },
    Other: {
        name: 'Other',
        enabled: true,
    },
};

type Props = WithPolicyOnyxProps;

function WorkspaceTaxesPage({policy}: Props) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const {isSmallScreenWidth} = useWindowDimensions();
    const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);

    const taxesList = useMemo<TaxForList[]>(
        () =>
            Object.values(taxesCategories ?? {}).map((value) => ({
                value: value.name,
                text: value.name,
                keyForList: value.name,
                isSelected: selectedTaxes.includes(value.name),
                rightElement: (
                    // TODO: Extract this into a separate component together with WorkspaceCategoriesPage
                    <View style={styles.flexRow}>
                        <Text style={[styles.disabledText, styles.alignSelfCenter]}>{value.enabled ? translate('workspace.common.enabled') : translate('workspace.common.disabled')}</Text>
                        <View style={styles.p1}>
                            <Icon
                                src={Expensicons.ArrowRight}
                                fill={theme.icon}
                            />
                        </View>
                    </View>
                ),
            })),
        [selectedTaxes, styles.alignSelfCenter, styles.disabledText, styles.flexRow, styles.p1, theme.icon, translate],
    );

    const toggleTax = (tax: TaxForList) => {
        setSelectedTaxes((prev) => {
            if (prev.includes(tax.value)) {
                return prev.filter((item) => item !== tax.value);
            }
            return [...prev, tax.value];
        });
    };

    const toggleAllTaxes = () => {
        const isAllSelected = taxesList.every((tax) => tax.isSelected);
        if (isAllSelected) {
            setSelectedTaxes([]);
        } else {
            setSelectedTaxes(taxesList.map((item) => item.value));
        }
    };

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
            />
            <Text>WorkspaceTaxesPage</Text>
            <SelectionList
                canSelectMultiple
                sections={[{data: taxesList, indexOffset: 0, isDisabled: false}]}
                onSelectRow={(tax: TaxForList) => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS.getRoute(policy?.id ?? '', tax.value))}
                onSelectAll={toggleAllTaxes}
                showScrollIndicator
            />
        </ScreenWrapper>
    );
}

WorkspaceTaxesPage.displayName = 'WorkspaceTaxesPage';

export default withPolicyAndFullscreenLoading(WorkspaceTaxesPage);

import type {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import {PressableWithFeedback} from '@components/Pressable';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import Navigation from '@libs/Navigation/Navigation';
import type {CentralPaneNavigatorParamList} from '@libs/Navigation/types';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';

type TaxForList = {
    value: string;
    text: string;
    keyForList: string;
    isSelected: boolean;
    rightElement: JSX.Element;
};

type WorkspaceTaxesPageOnyxProps = {
    policyTaxRates: OnyxEntry<OnyxTypes.PolicyTaxRateWithDefault>;
};

type WorkspaceTaxesPageProps = WithPolicyAndFullscreenLoadingProps & WorkspaceTaxesPageOnyxProps & StackScreenProps<CentralPaneNavigatorParamList, typeof SCREENS.WORKSPACE.TAXES>;

function WorkspaceTaxesPage({policy, policyTaxRates}: WorkspaceTaxesPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const {isSmallScreenWidth} = useWindowDimensions();
    const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);

    const taxesList = useMemo<TaxForList[]>(
        () =>
            Object.values(policyTaxRates?.taxes ?? {}).map((value) => ({
                value: value.name,
                text: value.name,
                keyForList: value.name,
                isSelected: selectedTaxes.includes(value.name),
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
        [policyTaxRates?.taxes, selectedTaxes, styles.alignSelfCenter, styles.disabledText, styles.flexRow, styles.p1, theme.icon, translate],
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
            >
                <PressableWithFeedback
                    accessibilityRole="button"
                    accessible
                    role="button"
                    onPress={() => {}}
                    accessibilityLabel="New Tax"
                >
                    <Text>New Tax</Text>
                </PressableWithFeedback>
                <PressableWithFeedback
                    accessibilityRole="button"
                    accessible
                    role="button"
                    onPress={() => Navigation.navigate(ROUTES.WORKSPACE_TAXES_SETTINGS.getRoute(policy?.id ?? ''))}
                    accessibilityLabel={translate('common.settings')}
                >
                    <Text>{translate('common.settings')}</Text>
                </PressableWithFeedback>
            </HeaderWithBackButton>
            <SelectionList
                canSelectMultiple
                sections={[{data: taxesList, indexOffset: 0, isDisabled: false}]}
                onSelectRow={(tax: TaxForList) => Navigation.navigate(ROUTES.WORKSPACE_TAXES_EDIT.getRoute(policy?.id ?? '', tax.value))}
                onSelectAll={toggleAllTaxes}
                showScrollIndicator
            />
        </ScreenWrapper>
    );
}

WorkspaceTaxesPage.displayName = 'WorkspaceTaxesPage';

export default withPolicyAndFullscreenLoading(
    withOnyx<WorkspaceTaxesPageProps, WorkspaceTaxesPageOnyxProps>({
        policyTaxRates: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAX_RATE}${route.params.policyID}`,
        },
    })(WorkspaceTaxesPage),
);

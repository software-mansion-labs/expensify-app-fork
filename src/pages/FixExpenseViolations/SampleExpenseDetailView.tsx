import React from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import MenuItem from '@components/MenuItem';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {SampleExpense} from './sampleExpenses';

type SampleExpenseDetailViewProps = {
    expense: SampleExpense;
    paginationLabel: string;
    canPaginatePrevious: boolean;
    canPaginateNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onCategoryPress: () => void;
};

function SampleExpenseDetailView({expense, paginationLabel, canPaginatePrevious, canPaginateNext, onPrevious, onNext, onCategoryPress}: SampleExpenseDetailViewProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['BackArrow', 'ArrowRight', 'FallbackAvatar', 'Map', 'DownArrow']);

    const isMissingCategory = !expense.category;

    const summaryLine =
        expense.distance && expense.rate ? `${expense.amount} for ${expense.distance} @ ${expense.rate}` : `${expense.amount}${expense.merchant ? ` · ${expense.merchant}` : ''}`;

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <View style={[styles.ph5, styles.pt4, styles.pb3, styles.borderBottom]}>
                <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentCenter, styles.mb3]}>
                    <PressableWithoutFeedback
                        sentryLabel="FixExpenseViolations-Previous"
                        accessibilityLabel="Previous violation"
                        onPress={onPrevious}
                        disabled={!canPaginatePrevious}
                        style={[styles.p2, {borderRadius: 100, opacity: canPaginatePrevious ? 1 : 0.5}]}
                    >
                        <Icon
                            src={icons.BackArrow}
                            width={variables.iconSizeNormal}
                            height={variables.iconSizeNormal}
                            fill={theme.icon}
                        />
                    </PressableWithoutFeedback>
                    <Text style={[styles.textLabelSupporting, styles.mh3]}>{paginationLabel}</Text>
                    <PressableWithoutFeedback
                        sentryLabel="FixExpenseViolations-Next"
                        accessibilityLabel="Next violation"
                        onPress={onNext}
                        disabled={!canPaginateNext}
                        style={[styles.p2, {borderRadius: 100, opacity: canPaginateNext ? 1 : 0.5}]}
                    >
                        <Icon
                            src={icons.ArrowRight}
                            width={variables.iconSizeNormal}
                            height={variables.iconSizeNormal}
                            fill={theme.icon}
                        />
                    </PressableWithoutFeedback>
                </View>
                <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap3]}>
                    <View
                        style={[
                            styles.alignItemsCenter,
                            styles.justifyContentCenter,
                            {
                                width: variables.avatarSizeNormal,
                                height: variables.avatarSizeNormal,
                                borderRadius: variables.avatarSizeNormal / 2,
                                backgroundColor: theme.border,
                            },
                        ]}
                    >
                        <Icon
                            src={icons.FallbackAvatar}
                            width={variables.avatarSizeNormal}
                            height={variables.avatarSizeNormal}
                        />
                    </View>
                    <View style={styles.flex1}>
                        <Text style={[styles.textHeadlineH2]}>{summaryLine}</Text>
                        <Text style={[styles.textLabelSupporting, styles.mt1]}>
                            From Expense Report #{expense.reportNumber} in {expense.workspaceName}
                        </Text>
                    </View>
                </View>
                <View
                    style={[
                        styles.flexRow,
                        styles.alignItemsCenter,
                        styles.justifyContentCenter,
                        styles.bgTransparent,
                        styles.mt3,
                        styles.p3,
                        styles.br3,
                        {backgroundColor: theme.highlightBG},
                    ]}
                >
                    <Text style={[styles.textStrong, styles.mr2]}>More</Text>
                    <Icon
                        src={icons.DownArrow}
                        width={variables.iconSizeSmall}
                        height={variables.iconSizeSmall}
                        fill={theme.icon}
                    />
                </View>
            </View>

            <View style={[styles.flex1]}>
                <View style={[styles.ph5, styles.pt4]}>
                    <Text style={[styles.textLabelSupporting, styles.mb2]}>Receipt</Text>
                    <View style={[styles.alignItemsCenter, styles.justifyContentCenter, styles.br3, {height: 180, backgroundColor: theme.border}]}>
                        <Icon
                            src={icons.Map}
                            width={64}
                            height={64}
                            fill={theme.icon}
                        />
                        <Text style={[styles.textLabelSupporting, styles.mt2]}>Map placeholder</Text>
                    </View>
                </View>

                <MenuItemWithTopDescription
                    title={expense.amount}
                    description="Amount"
                    interactive={false}
                />
                <MenuItemWithTopDescription
                    title={expense.description || ''}
                    description="Description"
                    shouldShowRightIcon
                />
                {!!expense.distance && (
                    <MenuItemWithTopDescription
                        title={expense.distance}
                        description="Distance"
                        shouldShowRightIcon
                    />
                )}
                <MenuItem
                    title="Category"
                    description={expense.category ?? 'Missing category'}
                    descriptionTextStyle={isMissingCategory ? [styles.textLabelError] : undefined}
                    shouldShowRightIcon
                    brickRoadIndicator={isMissingCategory ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined}
                    onPress={onCategoryPress}
                />
                {!!expense.rate && (
                    <MenuItemWithTopDescription
                        title={expense.rate}
                        description="Rate"
                        shouldShowRightIcon
                    />
                )}
            </View>
        </View>
    );
}

export default SampleExpenseDetailView;

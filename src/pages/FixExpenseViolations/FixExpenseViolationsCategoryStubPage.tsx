import React from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {FixExpenseViolationsNavigatorParamList} from '@libs/Navigation/types';
import type SCREENS from '@src/SCREENS';
import SAMPLE_VIOLATION_EXPENSES from './sampleExpenses';

type FixExpenseViolationsCategoryStubPageProps = PlatformStackScreenProps<FixExpenseViolationsNavigatorParamList, typeof SCREENS.FIX_EXPENSE_VIOLATIONS.CATEGORY>;

function FixExpenseViolationsCategoryStubPage({route}: FixExpenseViolationsCategoryStubPageProps) {
    const styles = useThemeStyles();

    const indexParam = route.params?.index;
    const index = indexParam ? Number.parseInt(indexParam, 10) : 0;
    const expense = SAMPLE_VIOLATION_EXPENSES.at(index);

    return (
        <ScreenWrapper
            testID={FixExpenseViolationsCategoryStubPage.displayName}
            shouldEnableMaxHeight
        >
            <HeaderWithBackButton
                title="Edit Category"
                onBackButtonPress={() => Navigation.goBack()}
            />
            <View style={[styles.flex1, styles.ph5, styles.pt4]}>
                <Text style={styles.textHeadlineH2}>Edit Category for fixture {index + 1}</Text>
                <Text style={[styles.textLabelSupporting, styles.mt2]}>Current value: {expense?.category ?? '(missing)'}</Text>
                <Text style={[styles.textLabelSupporting, styles.mt4]}>This is a placeholder sub-page that demonstrates the in-sheet push pattern.</Text>
            </View>
        </ScreenWrapper>
    );
}

FixExpenseViolationsCategoryStubPage.displayName = 'FixExpenseViolationsCategoryStubPage';

export default FixExpenseViolationsCategoryStubPage;

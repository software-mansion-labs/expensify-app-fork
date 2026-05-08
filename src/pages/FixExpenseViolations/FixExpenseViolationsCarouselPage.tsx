import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent} from 'react-native';
import {View} from 'react-native';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {FixExpenseViolationsNavigatorParamList} from '@libs/Navigation/types';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import SampleExpenseDetailView from './SampleExpenseDetailView';
import SAMPLE_VIOLATION_EXPENSES from './sampleExpenses';

type FixExpenseViolationsCarouselPageProps = PlatformStackScreenProps<FixExpenseViolationsNavigatorParamList, typeof SCREENS.FIX_EXPENSE_VIOLATIONS.ROOT>;

function FixExpenseViolationsCarouselPage({route}: FixExpenseViolationsCarouselPageProps) {
    const styles = useThemeStyles();
    const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

    const initialIndex = (() => {
        const raw = route.params?.initialIndex;
        const parsed = raw ? Number.parseInt(raw, 10) : 0;
        if (Number.isNaN(parsed) || parsed < 0 || parsed >= SAMPLE_VIOLATION_EXPENSES.length) {
            return 0;
        }
        return parsed;
    })();

    const [activePageIndex, setActivePageIndex] = useState(initialIndex);
    const [pageWidth, setPageWidth] = useState(0);
    const hasPositionedToInitialIndex = useRef(false);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        setPageWidth(event.nativeEvent.layout.width);
    }, []);

    // Once we know the page width, scroll to the initial index without animation.
    useEffect(() => {
        if (pageWidth === 0 || hasPositionedToInitialIndex.current) {
            return;
        }
        hasPositionedToInitialIndex.current = true;
        scrollRef.current?.scrollTo({x: initialIndex * pageWidth, animated: false});
    }, [pageWidth, initialIndex]);

    const handleScrollEnd = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (pageWidth === 0) {
                return;
            }
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
            if (nextIndex === activePageIndex) {
                return;
            }
            setActivePageIndex(nextIndex);
        },
        [activePageIndex, pageWidth],
    );

    const goToPage = useCallback(
        (nextIndex: number) => {
            if (nextIndex < 0 || nextIndex >= SAMPLE_VIOLATION_EXPENSES.length || pageWidth === 0) {
                return;
            }
            scrollRef.current?.scrollTo({x: nextIndex * pageWidth, animated: true});
            setActivePageIndex(nextIndex);
        },
        [pageWidth],
    );

    const handleCategoryPress = useCallback((index: number) => {
        Navigation.navigate(ROUTES.FIX_EXPENSE_VIOLATIONS_CATEGORY.getRoute(index));
    }, []);

    return (
        <ScreenWrapper
            testID={FixExpenseViolationsCarouselPage.displayName}
            shouldEnableMaxHeight
        >
            <View
                style={styles.flex1}
                onLayout={handleLayout}
            >
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScrollEnd}
                    style={styles.flex1}
                >
                    {SAMPLE_VIOLATION_EXPENSES.map((expense, index) => (
                        <View
                            // eslint-disable-next-line react/no-array-index-key
                            key={`fix-violation-page-${index}`}
                            style={[styles.h100, {width: pageWidth}]}
                        >
                            <ScrollView
                                style={styles.flex1}
                                contentContainerStyle={styles.flexGrow1}
                            >
                                <SampleExpenseDetailView
                                    expense={expense}
                                    paginationLabel={`Violation ${index + 1} of ${SAMPLE_VIOLATION_EXPENSES.length}`}
                                    canPaginatePrevious={activePageIndex > 0}
                                    canPaginateNext={activePageIndex < SAMPLE_VIOLATION_EXPENSES.length - 1}
                                    onPrevious={() => goToPage(activePageIndex - 1)}
                                    onNext={() => goToPage(activePageIndex + 1)}
                                    onCategoryPress={() => handleCategoryPress(index)}
                                />
                            </ScrollView>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </ScreenWrapper>
    );
}

FixExpenseViolationsCarouselPage.displayName = 'FixExpenseViolationsCarouselPage';

export default FixExpenseViolationsCarouselPage;

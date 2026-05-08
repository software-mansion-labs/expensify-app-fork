import React, {useCallback, useEffect, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import NoDropZone from '@components/DragAndDrop/NoDropZone';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import Navigation from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {FixExpenseViolationsNavigatorParamList} from '@libs/Navigation/types';
import FixExpenseViolationsCarouselPage from '@pages/FixExpenseViolations/FixExpenseViolationsCarouselPage';
import FixExpenseViolationsCategoryStubPage from '@pages/FixExpenseViolations/FixExpenseViolationsCategoryStubPage';
import variables from '@styles/variables';
import SCREENS from '@src/SCREENS';

const Stack = createPlatformStackNavigator<FixExpenseViolationsNavigatorParamList>();

const SHEET_HEIGHT_RATIO = 0.85;
const SHEET_BORDER_RADIUS = 16;
const DRAG_HANDLE_HEIGHT = 24;
const DRAG_HANDLE_BAR_WIDTH = 36;
const DRAG_HANDLE_BAR_HEIGHT = 4;
const SWIPE_DOWN_DISMISS_THRESHOLD = 100;
const ENTER_DURATION_MS = 250;
const EXIT_DURATION_MS = 200;

function FixExpenseViolationsNavigator() {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {windowHeight} = useWindowDimensions();

    // 0 = offscreen + overlay invisible, 1 = onscreen + overlay at full dim opacity.
    // Driven by Reanimated so it works on web AND native (useCardAnimation only works in @react-navigation/stack).
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.set(withTiming(1, {duration: ENTER_DURATION_MS}));
    }, [progress]);

    const dismiss = useCallback(() => {
        progress.set(
            withTiming(0, {duration: EXIT_DURATION_MS}, (finished) => {
                if (!finished) {
                    return;
                }
                scheduleOnRN(Navigation.goBack);
            }),
        );
    }, [progress]);

    // Pan gesture lives on the drag handle bar at the top of the sheet only — putting it on the whole
    // sheet body would compete with the inner ScrollViews on Android and never activate.
    const swipeDownGesture = useMemo(
        () =>
            Gesture.Pan()
                .enabled(shouldUseNarrowLayout)
                .runOnJS(true)
                .onEnd((event) => {
                    if (event.translationY <= SWIPE_DOWN_DISMISS_THRESHOLD) {
                        return;
                    }
                    dismiss();
                }),
        [shouldUseNarrowLayout, dismiss],
    );

    const sheetHeight = Math.round(windowHeight * SHEET_HEIGHT_RATIO);

    const panelStyle = shouldUseNarrowLayout
        ? {
              position: 'absolute' as const,
              left: 0,
              right: 0,
              bottom: 0,
              height: sheetHeight,
              borderTopLeftRadius: SHEET_BORDER_RADIUS,
              borderTopRightRadius: SHEET_BORDER_RADIUS,
              backgroundColor: theme.appBG,
              overflow: 'hidden' as const,
          }
        : {
              position: 'absolute' as const,
              top: 0,
              right: 0,
              bottom: 0,
              width: variables.sideBarWidth,
              backgroundColor: theme.appBG,
              overflow: 'hidden' as const,
          };

    const overlayAnimatedStyle = useAnimatedStyle(() => ({
        opacity: progress.get() * variables.overlayOpacity,
    }));

    const panelAnimatedStyle = useAnimatedStyle(() => {
        const remainder = 1 - progress.get();
        if (shouldUseNarrowLayout) {
            return {transform: [{translateY: remainder * windowHeight}]};
        }
        return {transform: [{translateX: remainder * variables.sideBarWidth}]};
    });

    return (
        <NoDropZone>
            <Animated.View
                style={[StyleSheet.absoluteFill, styles.overlayBackground, overlayAnimatedStyle]}
                pointerEvents="none"
            />
            <PressableWithoutFeedback
                sentryLabel="FixExpenseViolations-Backdrop"
                accessibilityLabel="Close"
                onPress={dismiss}
                style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[panelStyle, panelAnimatedStyle]}>
                {shouldUseNarrowLayout && (
                    <GestureDetector gesture={swipeDownGesture}>
                        <View
                            style={{
                                height: DRAG_HANDLE_HEIGHT,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: theme.appBG,
                            }}
                        >
                            <View
                                style={{
                                    width: DRAG_HANDLE_BAR_WIDTH,
                                    height: DRAG_HANDLE_BAR_HEIGHT,
                                    borderRadius: DRAG_HANDLE_BAR_HEIGHT / 2,
                                    backgroundColor: theme.border,
                                }}
                            />
                        </View>
                    </GestureDetector>
                )}
                <View style={styles.flex1}>
                    <Stack.Navigator screenOptions={{headerShown: false, animation: Animations.SLIDE_FROM_RIGHT}}>
                        <Stack.Screen
                            name={SCREENS.FIX_EXPENSE_VIOLATIONS.ROOT}
                            component={FixExpenseViolationsCarouselPage}
                        />
                        <Stack.Screen
                            name={SCREENS.FIX_EXPENSE_VIOLATIONS.CATEGORY}
                            component={FixExpenseViolationsCategoryStubPage}
                        />
                    </Stack.Navigator>
                </View>
            </Animated.View>
        </NoDropZone>
    );
}

export default FixExpenseViolationsNavigator;

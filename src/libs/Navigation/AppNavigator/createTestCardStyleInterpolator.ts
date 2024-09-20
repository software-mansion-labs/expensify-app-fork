import type {StackCardInterpolatedStyle, StackCardInterpolationProps} from '@react-navigation/stack';
import {background} from '@storybook/theming';
import {Animated} from 'react-native';
import type {StyleUtilsType} from '@styles/utils';
import overflow from '@styles/utils/overflow';
import variables from '@styles/variables';

type ModalCardStyleInterpolator = (
    isSmallScreenWidth: boolean,
    isFullScreenModal: boolean,
    shouldUseNarrowLayout: boolean,
    stackCardInterpolationProps: StackCardInterpolationProps,
    outputRangeMultiplier?: number,
) => StackCardInterpolatedStyle;

type TestCardStyleInterpolator = (StyleUtils: StyleUtilsType) => ModalCardStyleInterpolator;

const createTestCardStyleInterpolator: TestCardStyleInterpolator =
    (StyleUtils) =>
    (isSmallScreenWidth, isFullScreenModal, shouldUseNarrowLayout, {current: {progress}, inverted, layouts: {screen}}, outputRangeMultiplier = 1) => {
        const cardStyle = StyleUtils.getCardStyles(screen.width);

        // Calculate translateX to move sidebar to the right side.
        const translateX = screen.width - variables.sideBarWidth;

        // animate overlay opacity
        const overlayOpacity = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1], // change overlay opacity from 0 - invisible to 1 - fully visible
        });

        return {
            containerStyle: {
                width: variables.sideBarWidth,
                transform: [{translateX}], // Add translating to the right
            },
            cardStyle: {
                opacity: progress, // The cards underneath will fade in
                transform: [{translateX: 0}],
            },
            overlayStyle: {
                // Pay attention to this part for custom overlay animation
                opacity: progress.interpolate({
                    // Fade the overlay in independently
                    inputRange: [0, 1],
                    outputRange: [0, 0.5], // Overlay transparency at the half way
                }),
                transform: [{translateX: 0}],
                position: 'absolute',
                left: 0,
            },
        };
    };

export default createTestCardStyleInterpolator;

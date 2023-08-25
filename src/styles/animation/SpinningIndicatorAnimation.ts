import {Animated, Easing} from 'react-native';
import useNativeDriver from '../../libs/useNativeDriver';

class SpinningIndicatorAnimation {
    rotate: Animated.Value;

    scale: Animated.Value;

    constructor() {
        this.rotate = new Animated.Value(0);
        this.scale = new Animated.Value(1);
        this.startRotation = this.startRotation.bind(this);
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.getSyncingStyles = this.getSyncingStyles.bind(this);
    }

    /**
     * Rotation animation for indicator in a loop
     *
     * @memberof AvatarWithImagePicker
     */
    startRotation(): void {
        this.rotate.setValue(0);
        Animated.loop(
            Animated.timing(this.rotate, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                isInteraction: false,

                // Animated.loop does not work with `useNativeDriver: true` on Web
                useNativeDriver,
            }),
        ).start();
    }

    /**
     * Start Animation for Indicator
     *
     * @memberof AvatarWithImagePicker
     */
    start(): void {
        this.startRotation();
        Animated.spring(this.scale, {
            toValue: 1.666,
            tension: 1,
            isInteraction: false,
            useNativeDriver: true,
        }).start();
    }

    /**
     * Stop Animation for Indicator
     *
     * @memberof AvatarWithImagePicker
     */
    stop(): void {
        Animated.spring(this.scale, {
            toValue: 1,
            tension: 1,
            isInteraction: false,
            useNativeDriver: true,
        }).start(() => {
            this.rotate.resetAnimation();
            this.scale.resetAnimation();
            this.rotate.setValue(0);
        });
    }

    /**
     * Get Indicator Styles while animating
     */
    getSyncingStyles(): unknown {
        return {
            transform: [
                {
                    rotate: this.rotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-360deg'],
                    }),
                },
                {
                    scale: this.scale,
                },
            ],
        };
    }
}

export default SpinningIndicatorAnimation;

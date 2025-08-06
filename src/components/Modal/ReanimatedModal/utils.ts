import {Easing, Keyframe} from 'react-native-reanimated';
import type {ReanimatedKeyframe} from 'react-native-reanimated';
import type {AnimationIn, AnimationOut} from './types';

const easing = Easing.bezier(0.76, 0.0, 0.24, 1.0).factory();

const SlideInRight = new Keyframe({
    from: {transform: [{translateX: '100%'}]},
    to: {
        transform: [{translateX: '0%'}],
        easing,
    },
});

const SlideInUp = new Keyframe({
    from: {transform: [{translateY: '100%'}]},
    to: {
        transform: [{translateY: '0%'}],
        easing,
    },
});

const FadeIn = new Keyframe({
    from: {opacity: 0},
    to: {
        opacity: 1,
        easing,
    },
});

const SlideOutRight = new Keyframe({
    from: {transform: [{translateX: '0%'}]},
    to: {
        transform: [{translateX: '100%'}],
        easing,
    },
});

const SlideOutDown = new Keyframe({
    from: {transform: [{translateY: '0%'}]},
    to: {
        transform: [{translateY: '100%'}],
        easing,
    },
});

const FadeOut = new Keyframe({
    from: {opacity: 1},
    to: {
        opacity: 0,
        easing,
    },
});

function getModalInAnimation(animationType: AnimationIn): ReanimatedKeyframe {
    switch (animationType) {
        case 'slideInRight':
            return SlideInRight;
        case 'slideInUp':
            return SlideInUp;
        case 'fadeIn':
            return FadeIn;
        default:
            throw new Error('Unknown animation type');
    }
}

function getModalOutAnimation(animationType: AnimationOut): ReanimatedKeyframe {
    switch (animationType) {
        case 'slideOutRight':
            return SlideOutRight;
        case 'slideOutDown':
            return SlideOutDown;
        case 'fadeOut':
            return FadeOut;
        default:
            throw new Error('Unknown animation type');
    }
}

export {getModalInAnimation, getModalOutAnimation, easing};

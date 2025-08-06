import {Easing, Keyframe} from 'react-native-reanimated';
import type {ReanimatedKeyframe} from 'react-native-reanimated';
import type {AnimationIn, AnimationOut} from './types';

const easing = Easing.bezier(0.76, 0.0, 0.24, 1.0).factory();

function getModalInAnimation(animationType: AnimationIn): ReanimatedKeyframe {
    switch (animationType) {
        case 'slideInRight':
            return new Keyframe({
                from: {transform: [{translateX: '100%'}]},
                to: {
                    transform: [{translateX: '0%'}],
                    easing,
                },
            });
        case 'slideInUp':
            return new Keyframe({
                from: {transform: [{translateY: '100%'}]},
                to: {
                    transform: [{translateY: '0%'}],
                    easing,
                },
            });
        case 'fadeIn':
            return new Keyframe({
                from: {opacity: 0},
                to: {
                    opacity: 1,
                    easing,
                },
            });
        default:
            throw new Error('Unknown animation type');
    }
}

function getModalOutAnimation(animationType: AnimationOut): ReanimatedKeyframe {
    switch (animationType) {
        case 'slideOutRight':
            return new Keyframe({
                from: {transform: [{translateX: '0%'}]},
                to: {
                    transform: [{translateX: '100%'}],
                    easing,
                },
            });
        case 'slideOutDown':
            return new Keyframe({
                from: {transform: [{translateY: '0%'}]},
                to: {
                    transform: [{translateY: '100%'}],
                    easing,
                },
            });
        case 'fadeOut':
            return new Keyframe({
                from: {opacity: 1},
                to: {
                    opacity: 0,
                    easing,
                },
            });
        default:
            throw new Error('Unknown animation type');
    }
}

export {getModalInAnimation, getModalOutAnimation, easing};

import type {ParamListBase, ScreenLayoutArgs} from '@react-navigation/native';
import {StackNavigationOptions} from '@react-navigation/stack';
import {useLayoutEffect} from 'react';
import {PlatformStackNavigationOptions, PlatformStackNavigationProp} from '@libs/Navigation/PlatformStackNavigation/types';
import {endTransition, startTransition} from '@libs/Navigation/TransitionTracker';

function InteractionManagerLayout({
    children,
    navigation,
    options,
    route,
}: ScreenLayoutArgs<ParamListBase, string, StackNavigationOptions | PlatformStackNavigationOptions, PlatformStackNavigationProp<ParamListBase>>) {
    useLayoutEffect(() => {
        const transitionStartListener = navigation.addListener('transitionStart', () => {
            console.log('transitionStart', route?.name);
            // startTransition();
        });
        const transitionEndListener = navigation.addListener('transitionEnd', () => {
            console.log('transitionEnd', route?.name);
            // endTransition();
        });

        return () => {
            transitionStartListener();
            transitionEndListener();
        };
    }, [navigation, options.animation, route?.name]);

    return children;
}

export default InteractionManagerLayout;

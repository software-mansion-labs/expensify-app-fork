import type {DefaultNavigatorOptions, ParamListBase, StackNavigationState, StackRouterOptions} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {StackNavigationEventMap, StackNavigationOptions} from '@react-navigation/stack';
import {NativeStackNavigatorProps} from 'react-native-screens/lib/typescript/native-stack/types';

type SplitStackNavigatorRouterOptions = StackRouterOptions & {defaultCentralScreen: string; sidebarScreen: string};

type SplitStackNavigatorProps<ParamList extends ParamListBase> = DefaultNavigatorOptions<
    ParamListBase,
    StackNavigationState<ParamListBase>,
    StackNavigationOptions,
    StackNavigationEventMap
> & {
    defaultCentralScreen: Extract<keyof ParamList, string>;
    sidebarScreen: Extract<keyof ParamList, string>;
};

export type {SplitStackNavigatorProps, SplitStackNavigatorRouterOptions};

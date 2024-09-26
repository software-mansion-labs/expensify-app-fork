import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';
import type {StackNavigationOptions} from '@react-navigation/stack';
import type CommonProperties from '@src/types/utils/CommonProperties';

// Navigation properties that are only available in web or native stack navigations.
type WebOnlyNavigationOptions = StackNavigationOptions;
type NativeOnlyNavigationOptions = NativeStackNavigationOptions;

// Common navigation options merged from both stack and native-stack navigations.
type CommonStackNavigationOptions = CommonProperties<StackNavigationOptions, NativeStackNavigationOptions>;

// type CardOptions = {
//     cardShadowEnabled?: StackNavigationOptions['cardShadowEnabled'];
//     cardOverlayEnabled?: StackNavigationOptions['cardOverlayEnabled'];
//     cardOverlay?: StackNavigationOptions['cardOverlay'];
//     cardStyle?: StackNavigationOptions['cardStyle'];
//     cardStyleInterpolator: StackNavigationOptions['cardStyleInterpolator'];
// };

type GeneralPlatformStackNavigationOptions = {
    web?: WebOnlyNavigationOptions;
    native?: NativeOnlyNavigationOptions;

    keyboardHandlingEnabled?: boolean;
    animation?: 'slide_from_left' | 'slide_from_right' | 'modal' | 'none';
    header?: unknown;
    statusBar?: unknown;
    presentation?: 'card' | 'modal' | 'transparentModal';
    gesture?: unknown;
};

// Combines common and general platform-specific options for PlatformStackNavigation.
type PlatformStackNavigationOptions = CommonStackNavigationOptions & GeneralPlatformStackNavigationOptions;

// Used to represent platform-specific navigation options.
type PlatformSpecificNavigationOptions = StackNavigationOptions | NativeStackNavigationOptions;

export type {
    WebOnlyNavigationOptions,
    NativeOnlyNavigationOptions,
    CommonStackNavigationOptions,
    GeneralPlatformStackNavigationOptions,
    PlatformStackNavigationOptions,
    PlatformSpecificNavigationOptions,
};

import EnvironmentProvider from '@components/EnvironmentContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import ScreenWrapperStatusContext from '@components/ScreenWrapper/ScreenWrapperStatusContext';
import {SearchContextProvider} from '@components/Search/SearchContextProvider';

import registerMiddlewares from '@libs/Middleware/register';

import colors from '@styles/theme/colors';

import ComposeProviders from '@src/components/ComposeProviders';
import HTMLEngineProvider from '@src/components/HTMLEngineProvider';
import {LocaleContextProvider} from '@src/components/LocaleContextProvider';
import {KeyboardStateProvider} from '@src/components/withKeyboardState';
import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';

import type {ReactNode} from 'react';
import type {Parameters} from 'storybook/internal/types';

import {PortalProvider} from '@gorhom/portal';
import React from 'react';
import Onyx from 'react-native-onyx';
// The insets context is provided directly to override the measured insets for every story, see ZeroSafeAreaInsetsProvider
// eslint-disable-next-line no-restricted-imports
import {SafeAreaInsetsContext, SafeAreaProvider} from 'react-native-safe-area-context';

import './fonts.css';

registerMiddlewares();

Onyx.init({
    keys: ONYXKEYS,
});

IntlStore.load(CONST.LOCALES.EN);

const ZERO_SAFE_AREA_INSETS = {top: 0, right: 0, bottom: 0, left: 0};

/**
 * Story previews run in a desktop browser with no device safe areas. The web SafeAreaProvider reports the part of a story
 * taller than the viewport as a bottom inset (e.g. after zooming in), which screens with `addBottomSafeAreaPadding` would add
 * as empty space below their content, so the insets are pinned to zero.
 */
function ZeroSafeAreaInsetsProvider({children}: {children: ReactNode}) {
    return <SafeAreaInsetsContext.Provider value={ZERO_SAFE_AREA_INSETS}>{children}</SafeAreaInsetsContext.Provider>;
}

const decorators = [
    (Story: React.ElementType) => (
        <ComposeProviders
            components={[
                OnyxListItemProvider,
                LocaleContextProvider,
                HTMLEngineProvider,
                SafeAreaProvider,
                ZeroSafeAreaInsetsProvider,
                PortalProvider,
                EnvironmentProvider,
                KeyboardStateProvider,
                SearchContextProvider,
            ]}
        >
            <ScreenWrapperStatusContext.Provider value={{didScreenTransitionEnd: true, isSafeAreaTopPaddingApplied: false, isSafeAreaBottomPaddingApplied: false}}>
                <Story />
            </ScreenWrapperStatusContext.Provider>
        </ComposeProviders>
    ),
];

const parameters: Parameters = {
    controls: {
        matchers: {
            color: /(background|color)$/i,
        },
    },
    backgrounds: {
        options: {
            dark: {name: 'Dark', value: colors.productDark100},
            light: {name: 'Light', value: colors.productLight100},
        },
    },
};

const initialGlobals = {
    backgrounds: {value: 'dark'},
};

export {decorators, parameters, initialGlobals};

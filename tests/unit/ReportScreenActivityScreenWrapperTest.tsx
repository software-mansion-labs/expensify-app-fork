import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import ScreenWrapper from '@components/ScreenWrapper';

import navigationRef from '@libs/Navigation/navigationRef';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';

import ONYXKEYS from '@src/ONYXKEYS';

import type * as ReactNavigation from '@react-navigation/native';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import renderCoverableScreen from '../utils/ScreenCoverHarness';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof ReactNavigation>('@react-navigation/native'),
    useRoute: () => ({key: 'report-route-key', name: 'Report', params: {reportID: '1'}}),
    useIsFocused: () => true,
}));

const onEntryTransitionEnd = jest.fn();

const Stack = createPlatformStackNavigator<{Report: undefined}>();

function ScreenWrapperUnderTest() {
    return (
        <ScreenWrapper
            testID="screen-wrapper-under-test"
            onEntryTransitionEnd={onEntryTransitionEnd}
        >
            <View testID="screen-wrapper-content" />
        </ScreenWrapper>
    );
}

// `ScreenWrapper` resolves its own route through `usePreventRemove`, so it only renders inside a real screen.
function ScreenWrapperScreen() {
    return (
        <NavigationContainer ref={navigationRef}>
            <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
                <Stack.Navigator>
                    <Stack.Screen
                        name="Report"
                        component={ScreenWrapperUnderTest}
                    />
                </Stack.Navigator>
            </ComposeProviders>
        </NavigationContainer>
    );
}

/**
 * `ScreenWrapper` reports the end of the screen's entry transition once, from an effect its own comment marks as
 * "component did mount". Every screen in the app sits inside it, so a reveal re-running that effect announces an entry
 * transition that never happened. The assertion describes behavior that ships today.
 */
describe('ScreenWrapper across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        await Onyx.clear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('announces the end of the entry transition once, not again on a reveal', async () => {
        const screen = renderCoverableScreen(<ScreenWrapperScreen />);
        await waitForBatchedUpdatesWithAct();
        jest.runOnlyPendingTimers();
        await waitForBatchedUpdatesWithAct();

        expect(onEntryTransitionEnd).toHaveBeenCalledTimes(1);

        await screen.hide();
        await screen.reveal();
        jest.runOnlyPendingTimers();
        await waitForBatchedUpdatesWithAct();

        // Coming back from a thread is not an entry transition, and the screen never left the tree to have one.
        expect(onEntryTransitionEnd).toHaveBeenCalledTimes(1);
    });
});

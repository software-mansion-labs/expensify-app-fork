/**
 * Repro + verification harness for https://github.com/Expensify/App/issues/97473 (Sentry APP-HT5)
 * and https://github.com/Expensify/App/pull/99314.
 *
 * Runs under `jest.repro.config.js` (jest-expo/web preset) so `@react-navigation/native`
 * resolves to the WEB `useLinking.js` - the variant whose `onStateChange` calls
 * `history.replaceState`. That is the call Safari caps at 100 per 10 seconds.
 *
 * The harness renders a real NavigationContainer with the app's real `navigationRef`, real
 * `linkingConfig`, and a root stack whose top-level route names match the real app
 * (TabNavigator + OnboardingModalNavigator). It then calls the real `startOnboardingFlow`
 * repeatedly and counts the resulting `window.history.replaceState` calls.
 *
 * Navigators are built from @react-navigation/core primitives rather than
 * @react-navigation/stack so nothing drags in native-only RN modules.
 */
import {linkingConfig} from '@libs/Navigation/linkingConfig';
import {navigationRef} from '@libs/Navigation/Navigation';

import {startOnboardingFlow} from '@userActions/Welcome/OnboardingFlow';

import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

import type {ParamListBase, StackNavigationState} from '@react-navigation/native';

import {createNavigatorFactory, NavigationContainer, StackRouter, useNavigationBuilder} from '@react-navigation/native';
import * as React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import Onyx from 'react-native-onyx';

/** Minimal DOM stack navigator: real StackRouter, no react-native dependency. */
function DomStackNavigator({initialRouteName, children, screenOptions}: Parameters<typeof useNavigationBuilder>[1] & {children: React.ReactNode}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const {state, descriptors, NavigationContent}: any = useNavigationBuilder(
        StackRouter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {initialRouteName, children, screenOptions} as any,
    );

    return (
        <NavigationContent>
            <div>
                {(state.routes as Array<{key: string; name: string}>).map((route, index: number) =>
                    index === state.index ? <div key={route.key}>{descriptors[route.key].render()}</div> : null,
                )}
            </div>
        </NavigationContent>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createDomStack = createNavigatorFactory(DomStackNavigator as any);

const RootStack = createDomStack();
const OnboardingStack = createDomStack();
const TabStack = createDomStack();

const Blank = () => <div />;

function TabNavigator() {
    return (
        <TabStack.Navigator>
            <TabStack.Screen
                name={SCREENS.HOME}
                component={Blank}
            />
        </TabStack.Navigator>
    );
}

const ONBOARDING_SCREENS = [SCREENS.ONBOARDING.PURPOSE, SCREENS.ONBOARDING.EMPLOYEES, SCREENS.ONBOARDING.PERSONAL_DETAILS, SCREENS.ONBOARDING.PRIVATE_DOMAIN, SCREENS.ONBOARDING.WORK_EMAIL];

function OnboardingModalNavigator() {
    return (
        <OnboardingStack.Navigator>
            {ONBOARDING_SCREENS.map((name) => (
                <OnboardingStack.Screen
                    key={name}
                    name={name}
                    component={Blank}
                />
            ))}
        </OnboardingStack.Navigator>
    );
}

const linking = {
    prefixes: ['https://new.expensify.com'],
    config: linkingConfig.config,
    getStateFromPath: linkingConfig.getStateFromPath,
    getPathFromState: linkingConfig.getPathFromState,
};

type Harness = {
    onyxSetCalls: () => number;
    replaceStateCalls: () => number;
    currentRouteName: () => string | undefined;
    rootRouteNames: () => string[];
    /** Nested route names inside ONBOARDING_MODAL_NAVIGATOR: this is what the back button walks. */
    onboardingStack: () => string[];
    unmount: () => void;
};

async function mountAt(path: string): Promise<Harness> {
    window.history.replaceState(null, '', path);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
        root.render(
            <NavigationContainer
                ref={navigationRef}
                linking={linking}
            >
                <RootStack.Navigator>
                    <RootStack.Screen
                        name={NAVIGATORS.TAB_NAVIGATOR}
                        component={TabNavigator}
                    />
                    <RootStack.Screen
                        name={NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR}
                        component={OnboardingModalNavigator}
                    />
                </RootStack.Navigator>
            </NavigationContainer>,
        );
    });

    // Count the Onyx writes getOnboardingInitialPath performs as a side effect, as a proxy for how much
    // work each startOnboardingFlow call still does before it decides to bail out.
    let onyxSetCount = 0;
    jest.spyOn(Onyx, 'set').mockImplementation(() => {
        onyxSetCount += 1;
        return Promise.resolve();
    });

    // Start counting only after the initial mount so the initial linking sync is excluded.
    let count = 0;
    const original = window.history.replaceState.bind(window.history);
    const spy = jest.spyOn(window.history, 'replaceState').mockImplementation(((...args: Parameters<typeof window.history.replaceState>) => {
        count += 1;
        return original(...args);
    }) as typeof window.history.replaceState);

    return {
        onyxSetCalls: () => onyxSetCount,
        replaceStateCalls: () => count,
        currentRouteName: () => navigationRef.getCurrentRoute()?.name,
        rootRouteNames: () => navigationRef.getRootState().routes.map((route) => route.name),
        onboardingStack: () => {
            const onboardingRoute = navigationRef.getRootState().routes.find((route) => route.name === NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR);
            return onboardingRoute?.state?.routes?.map((route) => route.name ?? '?') ?? [];
        },
        unmount: () => {
            spy.mockRestore();
            act(() => {
                root.unmount();
            });
            container.remove();
        },
    };
}

const CALLS = 20;

async function callStartOnboardingFlowRepeatedly(params: Parameters<typeof startOnboardingFlow>[0]) {
    for (let i = 0; i < CALLS; i++) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
            startOnboardingFlow(params);
        });
    }
}

// VSB user sitting on /onboarding/purpose: getOnboardingInitialPath resolves to /onboarding/employees.
const vsbParamsOnPurpose: Parameters<typeof startOnboardingFlow>[0] = {
    isUserFromPublicDomain: false,
    hasAccessiblePolicies: false,
    currentOnboardingPurposeSelected: undefined,
    currentOnboardingCompanySize: undefined,
    onboardingValues: undefined,
    onboardingValuesParam: {signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.VSB} as never,
    onboardingInitialPath: '/onboarding/purpose',
};

// Plain user sitting on /onboarding/purpose: getOnboardingInitialPath resolves to the same screen.
const plainParamsOnPurpose: Parameters<typeof startOnboardingFlow>[0] = {
    isUserFromPublicDomain: false,
    hasAccessiblePolicies: false,
    currentOnboardingPurposeSelected: undefined,
    currentOnboardingCompanySize: undefined,
    onboardingValues: undefined,
    onboardingInitialPath: '/onboarding/purpose',
};

const results: Record<string, unknown>[] = [];

function record(name: string, harness: Harness) {
    results.push({
        case: name,
        startOnboardingFlowCalls: CALLS,
        replaceStateCalls: harness.replaceStateCalls(),
        onyxSetCalls: harness.onyxSetCalls(),
        routeAfter: harness.currentRouteName(),
        rootRoutes: harness.rootRouteNames().join('+'),
        onboardingStack: harness.onboardingStack().join(' > '),
        url: window.location.pathname,
    });
}

describe('onboarding resetRoot -> history.replaceState', () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.unmount();
        harness = undefined;
        jest.restoreAllMocks();
    });

    afterAll(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        require('fs').writeFileSync('/private/tmp/onboarding-repro-results.json', JSON.stringify(results, null, 2));
    });

    it('CASE A: onboarding mounted, resolved target differs from the current screen', async () => {
        harness = await mountAt('/onboarding/purpose');

        expect(harness.rootRouteNames()).toContain(NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR);
        expect(harness.currentRouteName()).toBe(SCREENS.ONBOARDING.PURPOSE);

        await callStartOnboardingFlowRepeatedly(vsbParamsOnPurpose);
        record('A_mounted_target_differs', harness);
    });

    it('CASE B: onboarding not mounted yet, the flow has to enter the modal navigator', async () => {
        harness = await mountAt('/');

        expect(harness.rootRouteNames()).not.toContain(NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR);

        await callStartOnboardingFlowRepeatedly({...vsbParamsOnPurpose, onboardingInitialPath: null});
        record('B_not_mounted_yet', harness);
    });

    it('CASE C: onboarding mounted, resolved target equals the current screen', async () => {
        harness = await mountAt('/onboarding/purpose');

        await callStartOnboardingFlowRepeatedly(plainParamsOnPurpose);
        record('C_mounted_target_matches', harness);
    });
    it('CASE D: onboarding mounted, explicit resumePath target (the 2FA-resume shape)', async () => {
        harness = await mountAt('/onboarding/purpose');

        await callStartOnboardingFlowRepeatedly({...plainParamsOnPurpose, resumePath: '/onboarding/employees'});
        record('D_mounted_explicit_resumePath', harness);
    });
});

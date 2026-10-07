import {act, render, screen} from '@testing-library/react-native';

import useRootNavigationState from '@hooks/useRootNavigationState';

import type {NavigationState} from '@react-navigation/routers';
import type {ActivityProps, ReactNode} from 'react';

import {Activity, useEffect} from 'react';
import {View} from 'react-native';

const PENDING_NAVIGATION_LABEL = 'pendingNavigation';

type MockNavigation = {
    isReady: boolean;
    rootState: NavigationState | undefined;
};

const mockNavigation: MockNavigation = {
    isReady: true,
    rootState: undefined,
};

const mockListeners = new Map<string, Set<() => void>>();

// The real container ref reports an error when the root state is read before the navigator is mounted.
const mockGetRootState = jest.fn(() => (mockNavigation.isReady ? mockNavigation.rootState : undefined));

jest.mock('@libs/Navigation/navigationRef', () => ({
    __esModule: true,
    default: {
        isReady: () => mockNavigation.isReady,
        getRootState: () => mockGetRootState(),
        addListener: (event: string, listener: () => void) => {
            const eventListeners = mockListeners.get(event) ?? new Set<() => void>();
            eventListeners.add(listener);
            mockListeners.set(event, eventListeners);
            return () => eventListeners.delete(listener);
        },
    },
}));

jest.mock('@libs/Log', () => ({
    __esModule: true,
    default: {hmmm: jest.fn()},
}));

function createRootState(focusedRouteName: string): NavigationState {
    return {
        key: 'root',
        index: 0,
        routeNames: [focusedRouteName],
        routes: [{key: `${focusedRouteName}-key`, name: focusedRouteName}],
        type: 'stack',
        stale: false,
    };
}

function selectFocusedRouteName(state: NavigationState | undefined): string {
    if (!state) {
        return PENDING_NAVIGATION_LABEL;
    }
    return state.routes.at(state.index)?.name ?? PENDING_NAVIGATION_LABEL;
}

function changeRootState(focusedRouteName: string) {
    act(() => {
        mockNavigation.isReady = true;
        mockNavigation.rootState = createRootState(focusedRouteName);
        for (const listener of [...(mockListeners.get('state') ?? [])]) {
            listener();
        }
    });
}

type FocusedRouteProbeProps = {
    selector?: (state: NavigationState | undefined) => string;
    onCommit?: (focusedRouteName: string) => void;
};

function FocusedRouteProbe({selector = selectFocusedRouteName, onCommit}: FocusedRouteProbeProps) {
    const focusedRouteName = useRootNavigationState(selector);
    useEffect(() => {
        onCommit?.(focusedRouteName);
    });
    return (
        <View
            testID="focusedRouteProbe"
            accessibilityLabel={focusedRouteName}
        />
    );
}

function Screen({mode, children}: {mode: ActivityProps['mode']; children: ReactNode}) {
    return <Activity mode={mode}>{children}</Activity>;
}

describe('useRootNavigationState', () => {
    beforeEach(() => {
        mockListeners.clear();
        mockGetRootState.mockClear();
        mockNavigation.isReady = true;
        mockNavigation.rootState = createRootState('Home');
    });

    it('shows a root state change made while hidden once the probe is revealed', () => {
        // Given a visible probe mounted on a ready navigation focused on Home
        const probe = <FocusedRouteProbe />;
        const {rerender} = render(<Screen mode="visible">{probe}</Screen>);
        expect(screen.getByTestId('focusedRouteProbe')).toHaveProp('accessibilityLabel', 'Home');

        // When the root state changes to Search while the hidden probe has no 'state' listener, and the probe is revealed
        rerender(<Screen mode="hidden">{probe}</Screen>);
        changeRootState('Search');
        rerender(<Screen mode="visible">{probe}</Screen>);

        // Then the revealed probe reads the current root state instead of the one from before the hide
        expect(screen.getByTestId('focusedRouteProbe')).toHaveProp('accessibilityLabel', 'Search');
    });

    it('updates on a visible state event and skips the re-render when the selected value is unchanged', () => {
        // Given a visible probe that counts its commits, mounted on a ready navigation focused on Home
        const onCommit = jest.fn();
        render(
            <Screen mode="visible">
                <FocusedRouteProbe onCommit={onCommit} />
            </Screen>,
        );
        expect(onCommit).toHaveBeenCalledTimes(1);

        // When a 'state' event arrives with Search focused
        changeRootState('Search');

        // Then the probe re-renders once with the new value
        expect(screen.getByTestId('focusedRouteProbe')).toHaveProp('accessibilityLabel', 'Search');
        expect(onCommit).toHaveBeenCalledTimes(2);
        expect(onCommit).toHaveBeenLastCalledWith('Search');

        // When a 'state' event arrives with a new root state object that still focuses Search
        changeRootState('Search');

        // Then the probe does not re-render because the selected value is the same
        expect(onCommit).toHaveBeenCalledTimes(2);
    });

    it('passes undefined to the selector and skips the mount sync when navigation is not ready', () => {
        // Given navigation that is not ready yet, so reading the root state would report an error
        mockNavigation.isReady = false;
        mockNavigation.rootState = undefined;
        const selector = jest.fn(selectFocusedRouteName);

        // When the probe mounts
        render(
            <Screen mode="visible">
                <FocusedRouteProbe selector={selector} />
            </Screen>,
        );

        // Then the selector got undefined and the root state was never read
        expect(selector).toHaveBeenCalledWith(undefined);
        expect(mockGetRootState).not.toHaveBeenCalled();
        expect(screen.getByTestId('focusedRouteProbe')).toHaveProp('accessibilityLabel', PENDING_NAVIGATION_LABEL);

        // When navigation becomes ready and emits its first 'state' event
        changeRootState('Home');

        // Then the probe picks it up through the subscription made at mount
        expect(screen.getByTestId('focusedRouteProbe')).toHaveProp('accessibilityLabel', 'Home');
    });
});

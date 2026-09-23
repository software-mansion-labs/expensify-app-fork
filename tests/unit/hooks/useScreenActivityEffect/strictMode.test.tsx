import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import StrictModeMountGate from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/StrictModeMountGate';

import type {ReactNode} from 'react';

import React, {useEffect} from 'react';

import type {ScreenProps} from '../../../utils/ScreenActivityEffectTestUtils';

import {ActivityScreen, hidden, resetLog, runOn, Subject, visible} from '../../../utils/ScreenActivityEffectTestUtils';

// The gate picks its implementation at module load, so the flag has to be mocked before the import above runs.
jest.mock('@src/CONFIG', () => ({__esModule: true, default: {USE_ACTIVITY_SCREEN_STRICT_MODE_IN_DEV: true}}));

/**
 * React double-invokes layout and passive effects under StrictMode, never an insertion effect, so the hook sees the
 * double invocation as a passive cleanup with nothing owed followed by a body with nothing owed. These tests cover the
 * gate every screen opting into <Activity> renders below it and a StrictMode above the whole screen.
 */

/** The screen a development build renders, with the qualification gate below the <Activity>. */
function GatedActivityScreen({isHidden: isScreenHidden, children}: ScreenProps) {
    return (
        <ActivityScreen isHidden={isScreenHidden}>
            <StrictModeMountGate>{children}</StrictModeMountGate>
        </ActivityScreen>
    );
}

/** One component around several call sites, which is what the content of a screen is to the gate. */
function Group({children}: {children: ReactNode}) {
    return children;
}

/** A live screen with the same gate, which is what the gate alone does to an effect. */
function GatedLiveScreen({children}: ScreenProps) {
    return <StrictModeMountGate>{children}</StrictModeMountGate>;
}

/** The gate above the <Activity>, which is what a StrictMode higher up in the tree does to the whole screen. */
function GateAboveScreen({isHidden: isScreenHidden, children}: ScreenProps) {
    return (
        <StrictModeMountGate>
            <ActivityScreen isHidden={isScreenHidden}>{children}</ActivityScreen>
        </StrictModeMountGate>
    );
}

describe('useScreenActivityEffect under the StrictMode gate of a screen that opted into Activity', () => {
    beforeEach(() => {
        resetLog();
    });

    it('leaves the hook out of the remount cycle of the gate', async () => {
        // Given the gate that qualifies a screen for <Activity> by mounting its effects twice in development
        const steps = [visible(<Subject value="a" />)];

        // When the screen mounts and then leaves the stack
        const live = await runOn(useEffect, GatedLiveScreen, steps);
        const activity = await runOn(useScreenActivityEffect, GatedActivityScreen, steps);

        // Then plain useEffect goes through the cycle and the hook does not, because React never double-invokes an
        // insertion effect, so the second passive run finds nothing owed
        expect(live).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
        expect(activity).toEqual([['setup:s:a'], ['cleanup:s:a']]);
    });

    it('leaves every call site of a subtree the gate mounts as one out of the cycle', async () => {
        // Given two call sites under one component, which is the shape of a screen: the gate mounts it as one placed
        // subtree, so React disconnects every effect of it and then reconnects them one component at a time
        const steps = [
            visible(
                <Group>
                    <Subject
                        name="a"
                        value="1"
                    />
                    <Subject
                        name="b"
                        value="1"
                    />
                </Group>,
            ),
        ];

        // When the screen mounts and then leaves the stack
        const live = await runOn(useEffect, GatedLiveScreen, steps);
        const activity = await runOn(useScreenActivityEffect, GatedActivityScreen, steps);

        // Then neither call site goes through the cycle, because a disconnect with nothing owed keeps the setup
        expect(live).toEqual([
            ['setup:a:1', 'setup:b:1', 'cleanup:a:1', 'cleanup:b:1', 'setup:a:1', 'setup:b:1'],
            ['cleanup:a:1', 'cleanup:b:1'],
        ]);
        expect(activity).toEqual([
            ['setup:a:1', 'setup:b:1'],
            ['cleanup:a:1', 'cleanup:b:1'],
        ]);
    });

    it('runs once under a StrictMode above the screen as well', async () => {
        // Given a StrictMode above the <Activity>, which is what USE_REACT_STRICT_MODE_IN_DEV puts above the whole app
        const steps = [visible(<Subject value="a" />)];

        // When the screen mounts and then leaves the stack
        const activity = await runOn(useScreenActivityEffect, GateAboveScreen, steps);

        // Then the setup ran once, because the double invocation reaches the hook as passive effects only
        expect(activity).toEqual([['setup:s:a'], ['cleanup:s:a']]);
    });

    it('keeps the setup live through a cover and reveal cycle under a StrictMode above the screen', async () => {
        // Given a StrictMode above the <Activity>, which makes React double-invoke every effect of a revealed <Activity>
        const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

        // When the screen is covered and revealed
        const activity = await runOn(useScreenActivityEffect, GateAboveScreen, steps);

        // Then the reveal leaves the setup alone, because that double invocation is a passive cleanup with nothing
        // owed followed by a passive setup with nothing owed
        expect(activity).toEqual([['setup:s:a'], [], [], ['cleanup:s:a']]);
    });

    it('keeps the setup live through a cover and reveal cycle below the gate', async () => {
        // Given an effect on a screen with the gate below the <Activity>, which is where the wrapper renders it
        const steps = [visible(<Subject value="a" />), hidden(<Subject value="a" />), visible(<Subject value="a" />)];

        // When the screen is covered and revealed
        const live = await runOn(useEffect, GatedLiveScreen, steps);
        const activity = await runOn(useScreenActivityEffect, GatedActivityScreen, steps);

        // Then the gate changed nothing about the cover, and the hook skipped the remount cycle of the mount as well
        expect(live).toEqual([['setup:s:a', 'cleanup:s:a', 'setup:s:a'], [], [], ['cleanup:s:a']]);
        expect(activity).toEqual([['setup:s:a'], [], [], ['cleanup:s:a']]);
    });
});

import {render} from '@testing-library/react-native';

import type {ReactElement, ReactNode} from 'react';

import React, {Activity} from 'react';

import waitForBatchedUpdatesWithAct from './waitForBatchedUpdatesWithAct';

/**
 * How a covered screen behaves in the harness.
 *
 * - `freeze` mirrors what ships today: `ScreenFreezeWrapper` suspends rendering of a covered screen but leaves its
 *   effect tree mounted, so covering and uncovering never runs a cleanup or re-runs an effect.
 * - `activity` mirrors `ScreenActivityWrapper`: a hidden `<Activity>` cleans up the subtree's effects and re-runs them
 *   from scratch on reveal, while state and refs survive.
 *
 * Selected with the SCREEN_COVER_MODE env var so one suite can be run against both behaviors.
 */
type CoverMode = 'freeze' | 'activity';

function getCoverMode(): CoverMode {
    return process.env.SCREEN_COVER_MODE === 'activity' ? 'activity' : 'freeze';
}

function ScreenCover({isCovered, children}: {isCovered: boolean; children: ReactNode}) {
    if (getCoverMode() === 'freeze') {
        return children;
    }

    return <Activity mode={isCovered ? 'hidden' : 'visible'}>{children}</Activity>;
}

type RenderCoverableScreenOptions = {
    /**
     * Mounts the screen already covered, the way a deep link or a pre-mounted destination mounts a screen underneath
     * the one the user is looking at. Both behaviors still run the mount lifecycle for that case: `ScreenFreezeWrapper`
     * starts unfrozen and only suspends after its delay, and `ScreenActivityWrapper` renders the first frame visible
     * (`isKeptVisible = !hasCompletedFirstRender`) because React never mounts the effects of a hidden `<Activity>`.
     */
    startCovered?: boolean;
};

/**
 * Renders `ui` as the content of a screen that can be covered and uncovered, the way a split navigator covers a
 * report with a thread pushed on top of it and reveals it again on the way back.
 */
function renderCoverableScreen(ui: ReactElement, {startCovered = false}: RenderCoverableScreenOptions = {}) {
    // Cloning gives every pass a fresh element, so the subject re-renders the way a navigation state change
    // re-renders both screens instead of React bailing out on an identical element.
    const cover = (isCovered: boolean) => <ScreenCover isCovered={isCovered}>{React.cloneElement(ui)}</ScreenCover>;

    // The first frame is always visible, so the mount lifecycle runs before anything can hide the screen.
    const {rerender, unmount} = render(cover(false));

    const setCovered = async (isCovered: boolean) => {
        rerender(cover(isCovered));
        await waitForBatchedUpdatesWithAct();
    };

    if (startCovered) {
        rerender(cover(true));
    }

    return {
        hide: () => setCovered(true),
        reveal: () => setCovered(false),
        unmount,
    };
}

export default renderCoverableScreen;
export {getCoverMode, ScreenCover};
export type {CoverMode};

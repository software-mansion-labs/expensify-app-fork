import type {ActivityProps, ReactNode} from 'react';

import React, {Activity} from 'react';

import {ScreenActivityEffectBoundaryProvider} from './ScreenActivityEffectBoundaryContext';

type ActivityWithEffectBoundaryProps = {
    /** The mode of the <Activity>, which is also what the boundary reports to the effects of the subtree. */
    mode: NonNullable<ActivityProps['mode']>;

    children: ReactNode;
};

/**
 * The <Activity> of a screen together with the boundary that serves it. Everything useScreenActivityEffect promises
 * rests on the boundary rendering outside that <Activity> and reporting exactly its mode, and a boundary that reports
 * a hidden screen over a live subtree defers every cleanup of that screen forever. Both therefore come from one
 * component and one mode, so no call site can pair them wrongly.
 */
function ActivityWithEffectBoundary({mode, children}: ActivityWithEffectBoundaryProps) {
    return (
        <ScreenActivityEffectBoundaryProvider isHidden={mode === 'hidden'}>
            <Activity mode={mode}>{children}</Activity>
        </ScreenActivityEffectBoundaryProvider>
    );
}

export default ActivityWithEffectBoundary;

import {AlwaysPaintedContents} from '@components/AlwaysPaintedView';

import type {PropsWithChildren} from 'react';

import React, {Activity} from 'react';

import DevStrictModeMountGate from './StrictModeMountGate';
import useScreenActivityMode from './useScreenActivityMode';

/**
 * Gives one part of a screen the cover ScreenActivityWrapper gives a whole screen, for a screen that stays live because
 * some of its content cannot run under a hidden Activity. The part follows the same mode and passes the same StrictMode
 * gate, so only content whose effects survive a hide and reveal belongs in it.
 *
 * The rest of the screen stays live and interactive under the cover, so the part is not made inert either. Its node
 * adds no box, so wrapping a child keeps the layout of the parent unchanged.
 */
function ScreenActivitySection({children}: PropsWithChildren) {
    // Inside a screen, useIsFocused turns false for a cover by its own navigator as well as by a route higher in the tree.
    const {mode} = useScreenActivityMode(false);

    return (
        <Activity mode={mode}>
            <AlwaysPaintedContents>
                <DevStrictModeMountGate>{children}</DevStrictModeMountGate>
            </AlwaysPaintedContents>
        </Activity>
    );
}

export default ScreenActivitySection;

import useThemeStyles from '@hooks/useThemeStyles';

import PaintMarker from '@expensify/react-native-paint-observer';
import React from 'react';

import type {PaintObserverProps} from './types';

/**
 * Reports when the commit that set `paintKey` is painted. A new key mounts a new native marker in that commit, and the
 * marker reports the frame that shows its own mount.
 */
function PaintObserver({paintKey, onPaint, children}: PaintObserverProps) {
    const styles = useThemeStyles();

    return (
        <>
            {children}
            <PaintMarker
                key={paintKey}
                style={styles.pAbsolute}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                onPaint={(event) => onPaint({paintTime: event.nativeEvent.paintTime})}
            />
        </>
    );
}

export default PaintObserver;

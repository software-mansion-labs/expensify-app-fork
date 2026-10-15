import type {ReactNode} from 'react';

type PaintTiming = {
    /** When the frame that shows the commit reaches the screen, in the `performance.now()` clock. */
    paintTime: number;
};

type PaintObserverProps = {
    /** Each new key reports one paint: the frame that shows the React commit in which the key changed. */
    paintKey: string | number;

    /** Called once per `paintKey`. */
    onPaint: (timing: PaintTiming) => void;

    children?: ReactNode;
};

export type {PaintTiming, PaintObserverProps};

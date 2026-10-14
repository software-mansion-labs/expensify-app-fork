import CONST from '@src/CONST';

import {endSpanWithAttributes} from './activeSpans';
import startRequestPhaseSpan, {getRequestPhaseSpanId} from './startRequestPhaseSpan';
import waitForResponsiveFrames from './waitForResponsiveFrames';

/** Onyx resolves once subscribers are notified, before React renders, so StartupData.Apply cannot see this cascade. */
function trackStartupDataRender(command: string, attempt: number): void {
    const spanId = getRequestPhaseSpanId(CONST.TELEMETRY.SPAN_STARTUP_DATA.RENDER, attempt);
    const span = startRequestPhaseSpan(CONST.TELEMETRY.SPAN_STARTUP_DATA.RENDER, attempt, command);

    if (!span) {
        return;
    }

    waitForResponsiveFrames(({longestFrameMs, hasTimedOut}) => {
        endSpanWithAttributes(spanId, {
            [CONST.TELEMETRY.ATTRIBUTE_LONGEST_FRAME_MS]: Math.round(longestFrameMs),
            [CONST.TELEMETRY.ATTRIBUTE_TIMED_OUT]: hasTimedOut,
        });
    });
}

export default trackStartupDataRender;

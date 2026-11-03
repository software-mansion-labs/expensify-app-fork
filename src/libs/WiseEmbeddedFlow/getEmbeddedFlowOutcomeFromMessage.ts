/** Reads how Wise's hosted KYC form ended from the window messages it posts */
import {isRecord} from '@libs/ObjectUtils';

import CONST from '@src/CONST';

import type EmbeddedFlowOutcome from './types';

function parseMessage(data: string): unknown {
    try {
        return JSON.parse(data);
    } catch {
        return undefined;
    }
}

/** Reads how Wise's hosted form ended from a message it posted. Messages that do not end the form, such as ready and resize, give nothing. */
function getEmbeddedFlowOutcomeFromMessage(data: string): EmbeddedFlowOutcome | undefined {
    const message = parseMessage(data);
    if (!isRecord(message)) {
        return undefined;
    }
    if (message.type === CONST.WISE.EMBEDDED_FLOW.MESSAGE_TYPE.DONE) {
        return 'done';
    }
    if (message.type !== CONST.WISE.EMBEDDED_FLOW.MESSAGE_TYPE.ERROR) {
        return undefined;
    }
    return message.code === CONST.WISE.EMBEDDED_FLOW.CANCELLED_ERROR_CODE ? 'cancelled' : 'failed';
}

export default getEmbeddedFlowOutcomeFromMessage;

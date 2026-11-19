/**
 * Building blocks that the step definitions of both flows share.
 */
import type {FlowContext, StepDefinition} from './types';

/** The country step lives on the client, so it is complete once a country is known from the draft or from the server */
function isCountryKnown({server, draft}: FlowContext): boolean {
    return !!draft?.country || !!server?.country;
}

type OrderedSubPages = {
    /** The sub page that opens when the user arrives from the previous step */
    first: string;

    /** The sub page that opens when the user comes back from the next step */
    last: string;

    /** The sub page that opens on resume. Undefined lets the step pick the first sub page that still misses a value. */
    resume?: string;
};

/** Builds the entry rule of a step whose sub pages are walked in order, so forward opens the first one and backward the last one */
function getOrderedEntrySubPage({first, last, resume}: OrderedSubPages): NonNullable<StepDefinition['getEntrySubPage']> {
    return (context, direction) => {
        if (direction === 'resume') {
            return resume;
        }
        return direction === 'forward' ? first : last;
    };
}

export {getOrderedEntrySubPage, isCountryKnown};

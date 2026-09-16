import {getPersonalDetailOptionText} from '@libs/OptionsListUtils';
import {getPersonalDetailSearchTerms} from '@libs/OptionsListUtils/searchMatchUtils';

import CONST from '@src/CONST';
import type {PersonalDetails} from '@src/types/onyx';

import {Str} from 'expensify-common';

import type {OptionIndexRow, SearchOptionsIndexInputs} from './types';

import normalizeSearchText from './normalizeSearchText';

/** Logins the router never offers as a contact, whatever the rest of its configuration asks for. */
const EXCLUDED_CONTACT_LOGINS = new Set<string>([CONST.EMAIL.NOTIFICATIONS, CONST.ACCOUNT_EXECUTIVE_LOGIN, CONST.ACCOUNT_EXECUTIVE_LEGACY_LOGIN]);

/**
 * The contact filter of `getValidOptions` reads the personal detail and nothing else, and the router's
 * configuration leaves no query-time input in it, so the whole of it is decided here. The current user is
 * deliberately kept: the router asks for them with `includeCurrentUser`.
 */
function isContactSelectable(login: string | undefined, accountID: number | undefined): boolean {
    if (!login || !accountID) {
        return false;
    }
    return !Str.isDomainEmail(login) && !EXCLUDED_CONTACT_LOGINS.has(login);
}

/**
 * Builds the index row of one contact, carrying the same text its option would: the terms the canonical contact
 * matcher reads, plus the display text the pre-filter appends to them.
 */
function buildContactIndexRow(detail: PersonalDetails, hasDMReport: boolean, inputs: SearchOptionsIndexInputs): OptionIndexRow {
    const accountID = detail.accountID ?? CONST.DEFAULT_NUMBER_ID;
    const text = getPersonalDetailOptionText({accountID, hasReport: hasDMReport, personalDetails: inputs.personalDetails, login: detail.login, translate: inputs.translate});
    const searchTerms = getPersonalDetailSearchTerms({text, displayName: detail.displayName, login: detail.login, accountID, participantsList: [detail]}, inputs.currentUserAccountID);

    return {
        id: String(accountID),
        searchText: normalizeSearchText([...searchTerms, text].join(' ')),
        // The key `personalDetailsComparator` builds from the shell, which is the alphabetical order of the list.
        orderKey: text.toLowerCase(),
        isSelectable: isContactSelectable(detail.login, detail.accountID),
    };
}

export default buildContactIndexRow;

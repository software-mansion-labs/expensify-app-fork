import type {PrivateIsArchivedMap} from '@hooks/usePrivateIsArchivedMap';

import type {Options} from '@libs/OptionsListUtils';
import type {SearchOptionsFormatConfig, SearchOptionsIndexInputs} from '@libs/SearchOptionsIndex/types';

import CONST from '@src/CONST';
import type Login from '@src/types/onyx/Login';

import type {OnyxEntry} from 'react-native-onyx';

import type {SearchRouterDataset} from './collections/searchRouterDataset';

import {convertToDisplayString, translateLocal} from './TestHelper';

const CURRENT_USER_ACCOUNT_ID = 1;
const CURRENT_USER_EMAIL = 'me@example.com';
const EMPTY_LOGIN_LIST: OnyxEntry<Login> = {};
const MOCKED_BETAS = Object.values(CONST.BETAS);

/** The list configuration the SearchRouter passes to `getSearchOptions`, the one both index arms reproduce. */
function buildSearchRouterFormatConfig(dataset: SearchRouterDataset): SearchOptionsFormatConfig {
    return {
        dateFnsLocale: undefined,
        convertToDisplayString,
        translate: translateLocal,
        draftComments: {},
        betas: MOCKED_BETAS,
        loginList: EMPTY_LOGIN_LIST,
        currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
        currentUserEmail: CURRENT_USER_EMAIL,
        policyCollection: dataset.policies,
        personalDetails: dataset.personalDetails,
        sortedActions: undefined,
        conciergeReportID: undefined,
        isUsedInChatFinder: true,
        includeReadOnly: true,
        maxResults: CONST.AUTO_COMPLETE_SUGGESTER.MAX_AMOUNT_OF_SUGGESTIONS,
        includeUserToInvite: true,
        includeRecentReports: true,
        includeCurrentUser: true,
        shouldShowGBR: false,
        shouldUnreadBeBold: true,
    };
}

function toSearchOptionsIndexInputs(data: SearchRouterDataset, privateIsArchivedMap: PrivateIsArchivedMap = data.privateIsArchivedMap): SearchOptionsIndexInputs {
    return {
        reports: data.reports,
        personalDetails: data.personalDetails,
        reportAttributes: data.reportAttributes,
        policies: data.policies,
        privateIsArchivedMap,
        conciergeReportID: undefined,
        currentUserAccountID: CURRENT_USER_ACCOUNT_ID,
        locale: undefined,
        translate: translateLocal,
    };
}

/** The rows one result renders, in order, as ids comparable between the index and today's path. */
function optionIDs(options: Options): string[] {
    return [
        ...options.recentReports.map((option) => `r:${option.reportID}`),
        ...options.personalDetails.map((option) => `c:${option.accountID}`),
        `invite:${options.userToInvite?.login ?? ''}`,
    ];
}

export {buildSearchRouterFormatConfig, optionIDs, toSearchOptionsIndexInputs, CURRENT_USER_ACCOUNT_ID, CURRENT_USER_EMAIL};

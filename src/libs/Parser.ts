import ONYXKEYS from '@src/ONYXKEYS';

// eslint-disable-next-line no-restricted-imports
import {ExpensiMark} from 'expensify-common';
import Onyx from 'react-native-onyx';

import {deferUntilAppReady} from './deferUntilAppReady';
import Log from './Log';

let reportIDToNameMap: Record<string, string> = {};
// Lazy-Onyx POC (purity lane): a whole-collection subscription here would hydrate REPORT at module
// load — i.e. during boot. Deferred until the app is interactive; keyed fallback readers see
// undefined until the drain, same as before Onyx's first flush.
deferUntilAppReady(() => {
    Onyx.connect({
        key: ONYXKEYS.COLLECTION.REPORT,
        callback: (value) => {
            // Clear the map so removed reports don’t linger
            reportIDToNameMap = {};

            if (!value) {
                return;
            }

            for (const report of Object.values(value)) {
                if (!report) {
                    continue;
                }
                reportIDToNameMap[report.reportID] = report.reportName ?? report.reportID;
            }
        },
    });
}, 'low');

let accountIDToNameMap: Record<string, string> = {};
Onyx.connect({
    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
    callback: (personalDetailsList) => {
        // Clear the map so removed personal detail don’t linger
        accountIDToNameMap = {};
        for (const personalDetails of Object.values(personalDetailsList ?? {})) {
            if (!personalDetails) {
                continue;
            }

            accountIDToNameMap[personalDetails.accountID] = personalDetails.login ?? personalDetails.displayName ?? '';
        }
    },
});

type Extras = {
    reportIDToName?: Record<string, string>;
    accountIDToName?: Record<string, string>;
    cacheVideoAttributes?: (vidSource: string, attrs: string) => void;
    videoAttributeCache?: Record<string, string>;
};

class ExpensiMarkWithContext extends ExpensiMark {
    htmlToMarkdown(htmlString: string, extras?: Extras): string {
        return super.htmlToMarkdown(htmlString, {
            reportIDToName: extras?.reportIDToName ?? reportIDToNameMap,
            accountIDToName: extras?.accountIDToName ?? accountIDToNameMap,
            cacheVideoAttributes: extras?.cacheVideoAttributes,
        });
    }

    htmlToText(htmlString: string, extras?: Extras): string {
        return super.htmlToText(htmlString, {
            reportIDToName: extras?.reportIDToName ?? reportIDToNameMap,
            accountIDToName: extras?.accountIDToName ?? accountIDToNameMap,
            cacheVideoAttributes: extras?.cacheVideoAttributes,
        });
    }

    isHTML(text: string): boolean {
        return /<[^>]+>/.test(text) || /&[#\w]+;/.test(text);
    }
}

ExpensiMarkWithContext.setLogger(Log);
const Parser = new ExpensiMarkWithContext();

export default Parser;

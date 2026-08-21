import {deferUntilAppReady} from '@libs/deferUntilAppReady';
import intlPolyfill from '@libs/IntlPolyfill';
import {endSpan, getSpan, startSpan} from '@libs/telemetry/activeSpans';
import {installOnyxConnectDemandRecorder} from '@libs/telemetry/onyxBootStats';

import {setDeviceID} from '@userActions/Device';
import initOnyxDerivedValues from '@userActions/OnyxDerived';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import toSortedPolyfill from 'array.prototype.tosorted';
import {I18nManager} from 'react-native';
import Config from 'react-native-config';
import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import addUtilsToWindow from './addUtilsToWindow';
import platformSetup from './platformSetup';
import telemetry from './telemetry';

const enableDevTools = Config?.USE_REDUX_DEVTOOLS === 'true';

const RAM_ONLY_KEYS = [
    ONYXKEYS.RAM_ONLY_ARE_TRANSLATIONS_LOADING,
    ONYXKEYS.RAM_ONLY_MOBILE_SELECTION_MODE,
    ONYXKEYS.RAM_ONLY_IS_SIDEBAR_LOADED,
    ONYXKEYS.RAM_ONLY_IS_PRODUCT_MARKETING_WINDOW_COVERED,
    ONYXKEYS.DERIVED.RAM_ONLY_SORTED_REPORT_ACTIONS,
    ONYXKEYS.RAM_ONLY_IS_CHECKING_PUBLIC_ROOM,
    ONYXKEYS.RAM_ONLY_UPDATE_AVAILABLE,
    ONYXKEYS.RAM_ONLY_UPDATE_REQUIRED,
    ONYXKEYS.RAM_ONLY_IS_SEARCHING_FOR_REPORTS,
    ONYXKEYS.RAM_ONLY_IS_AUTHENTICATING_WITH_SHORT_LIVED_TOKEN,
    ONYXKEYS.RAM_ONLY_WALLET_ONFIDO,
    ONYXKEYS.RAM_ONLY_HAS_FRESH_WALLET_DATA,
    ONYXKEYS.RAM_ONLY_IS_LOADING_SEARCH_FILTERS_CATEGORY_DATA,
    ONYXKEYS.COLLECTION.RAM_ONLY_REPORT_LOADING_STATE,
    ONYXKEYS.COLLECTION.RAM_ONLY_COMPANY_CARDS_LOADING_STATE,
    ONYXKEYS.RAM_ONLY_PLAID_LINK_TOKEN,
    ONYXKEYS.RAM_ONLY_MERGE_HR_LINK_TOKEN,
    ONYXKEYS.COLLECTION.RAM_ONLY_ISSUE_NEW_EXPENSIFY_CARD,
    ONYXKEYS.RAM_ONLY_DOMAIN_MEMBERS_SELECTED_FOR_MOVE,
    ONYXKEYS.RAM_ONLY_HAS_DISMISSED_CONCIERGE_NOTIFICATION_BANNER,
];

// Lazy-Onyx POC (docs-poc/LAZY_ONYX_IMPLEMENTATION_PLAN.md, D6): EVERY persisted collection hydrates
// on demand instead of during init — init loads only the key index plus eager singleton values.
// RAM-only collections are excluded (they never touch storage, so there is nothing to defer).
const RAM_ONLY_KEY_SET = new Set<string>(RAM_ONLY_KEYS);
const LAZY_COLLECTIONS = Object.values(ONYXKEYS.COLLECTION).filter((collectionKey) => !RAM_ONLY_KEY_SET.has(collectionKey));

export default function () {
    telemetry();

    toSortedPolyfill.shim();

    /*
     * Initialize the Onyx store when the app loads for the first time.
     *
     * Note: This Onyx initialization has been very intentionally placed completely outside of the React lifecycle of the main App component.
     *
     * To understand why we must do this, you must first understand that a typical React Native Android application consists of an Application and an Activity.
     * The project root's index.js runs in the Application, but the main RN `App` component + UI runs in a separate Activity, spawned when you call AppRegistry.registerComponent.
     * When an application launches in a headless JS context (i.e: when woken from a killed state by a push notification), only the Application is available, but not the UI Activity.
     * This means that in a headless context NO REACT CODE IS EXECUTED, and none of your components will mount.
     *
     * However, we still need to use Onyx to update the underlying app data from the headless JS context.
     * Therefore it must be initialized completely outside the React component lifecycle.
     */
    // Measures the full Onyx boot hydration (storage read + JSON parse + cache populate) — the init
    // promise resolves only once the store is fully loaded, which also gates every subscription.
    startSpan(CONST.TELEMETRY.SPAN_ONYX_INIT, {
        name: CONST.TELEMETRY.SPAN_ONYX_INIT,
        op: CONST.TELEMETRY.SPAN_ONYX_INIT,
        parentSpan: getSpan(CONST.TELEMETRY.SPAN_APP_STARTUP),
    });

    Onyx.init({
        keys: ONYXKEYS,
        enableDevTools,
        evictableKeys: [
            ONYXKEYS.COLLECTION.REPORT_ACTIONS,
            ONYXKEYS.COLLECTION.SNAPSHOT,
            ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS,
            ONYXKEYS.COLLECTION.REPORT_ACTIONS_PAGES,
            ONYXKEYS.COLLECTION.REPORT_ACTIONS_REACTIONS,
        ],
        initialKeyStates: {
            // Clear any loading and error messages so they do not appear on app startup
            [ONYXKEYS.SESSION]: {loading: false},
            [ONYXKEYS.ACCOUNT]: CONST.DEFAULT_ACCOUNT_DATA,
            [ONYXKEYS.RAM_ONLY_IS_SIDEBAR_LOADED]: false,
            [ONYXKEYS.MODAL]: {
                isVisible: false,
                willAlertModalBecomeVisible: false,
            },
            [ONYXKEYS.RAM_ONLY_IS_PRODUCT_MARKETING_WINDOW_COVERED]: false,
            // Ensure the Supportal permission modal doesn't persist across reloads
            [ONYXKEYS.SUPPORTAL_PERMISSION_DENIED]: null,
            [ONYXKEYS.IS_OPEN_APP_FAILURE_MODAL_OPEN]: false,
        },
        skippableCollectionMemberIDs: CONST.SKIPPABLE_COLLECTION_MEMBER_IDS,
        snapshotMergeKeys: ['pendingAction', 'pendingFields'],
        ramOnlyKeys: RAM_ONLY_KEYS,
        lazyCollections: LAZY_COLLECTIONS,
        // Partial expression indexes accelerating Onyx.queryCollection over the hot collections.
        // Declarations are applied by the reconcileIndexes() call below (idle) — which also detects
        // and drops any Onyx-managed index whose declaration was removed from this list.
        indexes: {
            [ONYXKEYS.COLLECTION.REPORT]: ['policyID', 'lastVisibleActionCreated', 'parentReportID', 'type'],
            [ONYXKEYS.COLLECTION.TRANSACTION]: ['reportID'],
            [ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS]: ['private_isArchived'],
        },
    });

    OnyxUtils.getDeferredInitTask().promise.then(() => endSpan(CONST.TELEMETRY.SPAN_ONYX_INIT));

    // Index builds are O(collection) storage writes — run them from idle, never on the boot path.
    deferUntilAppReady(() => {
        Onyx.reconcileIndexes();
    }, 'low');

    // Must run before initOnyxDerivedValues so the derived engine's collection subscriptions are captured.
    installOnyxConnectDemandRecorder();

    // Must be imported after Onyx.init() and outside the React lifecycle so that push notification
    // handlers are registered before any push arrives, including Android headless/background wake-ups.
    import('@libs/Notification/PushNotification/subscribeToPushNotifications');

    // Lazy-Onyx POC (A2, demand-driven): registration is synchronous and free — each derived
    // value's engine (dependency subscriptions → hydration → compute) starts lazily on the FIRST
    // subscription to its output key, with a post-ready catch-all for the rest (see OnyxDerived/index).
    initOnyxDerivedValues();

    setDeviceID();

    // Preload all icons early in app initialization
    // This runs outside React lifecycle for optimal performance
    // Force app layout to work left to right because our design does not currently support devices using this mode
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);

    // Polyfill the Intl API if locale data is not as expected
    intlPolyfill();

    // Perform any other platform-specific setup
    platformSetup();

    addUtilsToWindow();
}

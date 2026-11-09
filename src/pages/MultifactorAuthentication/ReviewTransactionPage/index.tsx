import ActivityIndicator from '@components/ActivityIndicator';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Header from '@components/Header';
import {FreezeCardCancelConfirmModal, TerminateCardCancelConfirmModal} from '@components/MultifactorAuthentication/components/Modals';
import {AlreadyReviewedFailureScreen, DeniedTransactionServerFailureScreen} from '@components/MultifactorAuthentication/config/scenarios/AuthorizeTransaction';
import {useMultifactorAuthentication} from '@components/MultifactorAuthentication/Context';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {fireAndForgetReportFraudulentTransaction, reportFraudulentTransaction} from '@libs/actions/MultifactorAuthentication';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {MultifactorAuthenticationParamList} from '@libs/Navigation/types';

import MultifactorAuthenticationAuthorizeTransactionActions from '@pages/MultifactorAuthentication/AuthorizeTransactionPage/AuthorizeTransactionActions';
import useForcedReviewScreen from '@pages/MultifactorAuthentication/useForcedReviewScreen';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES, {DYNAMIC_ROUTES} from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import type {SeverityLevel} from '@sentry/react-native';

import * as Sentry from '@sentry/react-native';
import React, {useState} from 'react';
import {View} from 'react-native';

import FrozenCardOutcomeScreen from './FrozenCardOutcomeScreen';
import ReviewTransactionContent from './ReviewTransactionContent';
import TerminatedCardOutcomeScreen from './TerminatedCardOutcomeScreen';

function addBreadcrumb(message: string, data?: Record<string, string | number | boolean | undefined>, level: SeverityLevel = 'info'): void {
    Sentry.addBreadcrumb({
        message: `[Fraud Review] ${message}`,
        category: CONST.TELEMETRY.BREADCRUMB_CATEGORY_FRAUD_REVIEW_SCREEN,
        level,
        data,
    });
}

type ReviewTransactionPageProps = PlatformStackScreenProps<MultifactorAuthenticationParamList, typeof SCREENS.MULTIFACTOR_AUTHENTICATION.REVIEW_TRANSACTION>;

/** Forced review where the cardholder tells us whether they recognize a transaction declined as possible fraud */
function ReviewTransactionPage({route}: ReviewTransactionPageProps) {
    const transactionID = route.params.transactionID;

    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const [isReportingFraud, setIsReportingFraud] = useState(false);
    const [outcomeScreen, setOutcomeScreen] = useState<React.ReactElement | null>(null);

    const [transactionQueue] = useOnyx(ONYXKEYS.TRANSACTIONS_PENDING_FRAUD_REVIEW);
    const transaction = transactionQueue?.[transactionID];

    const {executeScenario} = useMultifactorAuthentication();

    // Outcomes render inside this RHP page, and leaving it isn't intercepted while one is shown
    const closeOutcome = () => {
        Navigation.closeRHPFlow();
    };

    // The card ID is read when the fraud is reported, since the server then removes the review from the queue
    const showReportedFraudOutcome = (cardID: number | undefined, isCardTerminated: boolean) => {
        const openCardDetails = () => {
            closeOutcome();
            if (cardID) {
                Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.WALLET_DOMAIN_CARD.getRoute(String(cardID)), ROUTES.SETTINGS_WALLET));
            }
        };
        // A terminated card is no longer listed on its own page, so the wallet is the closest place to see the cards
        const openWallet = () => {
            closeOutcome();
            Navigation.navigate(ROUTES.SETTINGS_WALLET);
        };
        setOutcomeScreen(
            isCardTerminated ? (
                <TerminatedCardOutcomeScreen
                    onCardDetailsPress={openWallet}
                    onClose={closeOutcome}
                />
            ) : (
                <FrozenCardOutcomeScreen
                    onUnfreezePress={openCardDetails}
                    onClose={closeOutcome}
                />
            ),
        );
    };

    // Backing out reports fraud, and the outcome shows right away since nobody waits for the response
    const reportFraudAndShowOutcome = () => {
        // The explicit report is already on its way and its response shows the outcome
        if (isReportingFraud) {
            addBreadcrumb('Back-out confirmed while reporting fraud, waiting for the report', {transactionID});
            return;
        }
        addBreadcrumb('Back-out confirmed, reporting fraud', {transactionID}, 'warning');
        fireAndForgetReportFraudulentTransaction({transactionID});
        showReportedFraudOutcome(transaction?.cardID, !!transaction?.willTerminateIfNotRecognized);
    };

    const {isConfirmModalVisible, showConfirmModal, hideConfirmModal, confirmBackOut, allowNavigatingAway} = useForcedReviewScreen({
        transactionID,
        isTransactionPendingReview: !!transaction,
        isSubmitting: isReportingFraud,
        isShowingOutcome: !!outcomeScreen,
        onConfirmBackOut: reportFraudAndShowOutcome,
        addBreadcrumb,
    });

    const confirmRecognized = () => {
        addBreadcrumb('Recognized tapped', {transactionID});
        allowNavigatingAway();
        executeScenario(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.REVIEW_FRAUD_TRANSACTION, {
            transactionID,
        });
    };

    const reportFraud = () => {
        addBreadcrumb('Unrecognized tapped', {transactionID});
        const cardID = transaction?.cardID;
        setIsReportingFraud(true);
        reportFraudulentTransaction({transactionID}).then(({reason, httpStatusCode, isCardTerminated}) => {
            addBreadcrumb('Fraud report completed', {transactionID, reason, httpStatusCode, isCardTerminated});
            if (reason === CONST.MULTIFACTOR_AUTHENTICATION.REASON.FLOW_OUTCOMES.FRAUD_REPORTED) {
                showReportedFraudOutcome(cardID, isCardTerminated);
                return;
            }
            if (reason === CONST.MULTIFACTOR_AUTHENTICATION.REASON.CLIENT_ERRORS.ALREADY_REVIEWED) {
                setOutcomeScreen(<AlreadyReviewedFailureScreen onClose={closeOutcome} />);
                return;
            }
            setOutcomeScreen(<DeniedTransactionServerFailureScreen onClose={closeOutcome} />);
        });
    };

    if (outcomeScreen) {
        return outcomeScreen;
    }

    // This will briefly be true after the fraud report has succeeded and Onyx has removed the transaction
    // from state, but reportFraudulentTransaction has not yet resolved.
    if (!transaction) {
        if (!isReportingFraud) {
            addBreadcrumb('Transaction unavailable', {transactionID}, 'warning');
        }
        return (
            <ScreenWrapper testID={ReviewTransactionPage.displayName}>
                <Header>
                    <Header.BackButton onPress={() => Navigation.closeRHPFlow()} />
                    <Header.Title title={translate('multifactorAuthentication.reviewTransaction.reviewTransaction')} />
                </Header>
                <View style={[styles.flex1, styles.fullScreenLoading]}>
                    <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                </View>
            </ScreenWrapper>
        );
    }

    const BackOutConfirmModal = transaction.willTerminateIfNotRecognized ? TerminateCardCancelConfirmModal : FreezeCardCancelConfirmModal;

    return (
        <ScreenWrapper testID={ReviewTransactionPage.displayName}>
            <Header>
                <Header.BackButton onPress={showConfirmModal} />
                <Header.Title title={translate('multifactorAuthentication.reviewTransaction.reviewTransaction')} />
            </Header>
            <FullPageOfflineBlockingView>
                <View style={[styles.flex1, styles.flexColumn, styles.justifyContentBetween]}>
                    <ScrollView style={styles.flex1}>
                        <ReviewTransactionContent transaction={transaction} />
                    </ScrollView>
                    <MultifactorAuthenticationAuthorizeTransactionActions
                        isLoading={isReportingFraud}
                        onAuthorize={confirmRecognized}
                        onDeny={reportFraud}
                        authorizeText={translate('multifactorAuthentication.fraudReview.recognizedButton')}
                        denyText={translate('multifactorAuthentication.fraudReview.unrecognizedButton')}
                        authorizeSentryLabel={CONST.SENTRY_LABEL.MULTIFACTOR_AUTHENTICATION.REVIEW_TRANSACTION_RECOGNIZED}
                        denySentryLabel={CONST.SENTRY_LABEL.MULTIFACTOR_AUTHENTICATION.REVIEW_TRANSACTION_NOT_RECOGNIZED}
                    />
                    <BackOutConfirmModal
                        isVisible={isConfirmModalVisible}
                        onConfirm={confirmBackOut}
                        onCancel={hideConfirmModal}
                    />
                </View>
            </FullPageOfflineBlockingView>
        </ScreenWrapper>
    );
}

ReviewTransactionPage.displayName = 'ReviewTransactionPage';

export default ReviewTransactionPage;

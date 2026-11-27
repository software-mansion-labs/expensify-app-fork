/**
 * The identity check of the USD flow. A fake Onfido widget keeps the real sequence: a token when the page opens, then
 * the check result. The step waits for the server to accept the result and stays with the error when it does not
 * (BC-05). The flow skips the step once the server finished the check.
 */
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Button from '@components/Button';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {OnboardingStep, PageLoadingIndicator, RequestErrorMessage, useOnboardingRequest, usePageNavigation, useReadOnOpen} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import {identityCheckFlowRead, verifyIdentityRequest} from './identityRequests';

/** The result that the fake widget returns. The mock server accepts any value. */
const MOCK_ONFIDO_DATA = 'mock-onfido-data';

function IdentityCheckPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {goNextAfter} = usePageNavigation();
    const [onfidoToken] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN);
    const identityCheck = useReadOnOpen(identityCheckFlowRead, {isEnabled: !onfidoToken});
    const verifyIdentity = useOnboardingRequest(verifyIdentityRequest);

    if (!onfidoToken && !identityCheck.hasFailed) {
        return <PageLoadingIndicator />;
    }
    if (!onfidoToken) {
        return (
            <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                <RequestErrorMessage message={translate('common.genericErrorMessage')} />
            </View>
        );
    }

    return (
        <View style={[styles.mh5, styles.gap3]}>
            <Text style={styles.textSupporting}>The real step opens the Onfido widget here. The mock accepts any result.</Text>
            <RequestErrorMessage message={verifyIdentity.errorMessage} />
            <Button
                variant={CONST.BUTTON_VARIANT.SUCCESS}
                isLoading={verifyIdentity.isPending}
                onPress={() => goNextAfter(verifyIdentity.send(MOCK_ONFIDO_DATA))}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
            >
                <Button.Text>[mock] Pass the identity check</Button.Text>
            </Button>
        </View>
    );
}

function VerifyIdentityStep() {
    const {translate} = useLocalize();

    return (
        <OnboardingStep
            title={translate('onfidoStep.verifyIdentity')}
            wrapperID="SimplifiedBankOnboardingVerifyIdentity"
        >
            <FullPageOfflineBlockingView>
                <IdentityCheckPage />
            </FullPageOfflineBlockingView>
        </OnboardingStep>
    );
}

export default VerifyIdentityStep;

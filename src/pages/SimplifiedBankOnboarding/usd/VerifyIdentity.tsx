/**
 * The identity check of the USD flow. A fake Onfido widget keeps the real sequence: a token on mount, then the check result.
 * Unlike the real step, which moves on at once, it waits for the answer to the result like the other steps, and only then
 * marks the check as done in the draft and moves on. When the check was already done, for example after direct URL
 * navigation, it skips itself on mount like the real step.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Button from '@components/Button';
import FormHelpMessage from '@components/FormHelpMessage';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {updateOnboardingDraft} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import {openIdentityCheckFlow, verifyIdentity} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';

import type USDPageProps from './types';

type VerifyIdentityProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'stepNames' | 'startStepIndex'>;

const MOCK_ONFIDO_DATA = 'mock-onfido-data';

function VerifyIdentity({onSubmit, onBackButtonPress, stepNames, startStepIndex}: VerifyIdentityProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [onfidoToken] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN);

    const policyID = account?.achData?.policyID;
    const isOnfidoAlreadyComplete = useRef(account?.achData?.isOnfidoSetupComplete);
    const onSubmitRef = useRef(onSubmit);
    const policyIDRef = useRef(policyID);

    useEffect(() => {
        if (isOnfidoAlreadyComplete.current) {
            onSubmitRef.current();
            return;
        }
        openIdentityCheckFlow(policyIDRef.current ?? '');
    }, []);

    const {send, isPending, errorMessage} = useStepRequest({
        onSuccess: () => {
            updateOnboardingDraft({isOnfidoSetupComplete: true});
            onSubmit();
        },
    });

    const passIdentityCheck = () => {
        send((requestID) => verifyIdentity(requestID, getBankAccountParams(policyID, account?.achData), MOCK_ONFIDO_DATA));
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingVerifyIdentity"
            headerTitle={translate('onfidoStep.verifyIdentity')}
            handleBackButtonPress={onBackButtonPress}
            startStepIndex={startStepIndex}
            stepNames={stepNames}
        >
            <FullPageOfflineBlockingView>
                {onfidoToken ? (
                    <View style={[styles.mh5, styles.gap3]}>
                        <Text style={styles.textSupporting}>The real step opens the Onfido widget here. The mock accepts any result.</Text>
                        <Button
                            variant={CONST.BUTTON_VARIANT.SUCCESS}
                            onPress={passIdentityCheck}
                            isLoading={isPending}
                            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                        >
                            <Button.Text>[mock] Pass the identity check</Button.Text>
                        </Button>
                        <FormHelpMessage message={errorMessage} />
                    </View>
                ) : (
                    <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                        <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                    </View>
                )}
            </FullPageOfflineBlockingView>
        </InteractiveStepWrapper>
    );
}

export default VerifyIdentity;

import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Header from '@components/Header';
import LoadingIndicator from '@components/LoadingIndicator';
import ScreenWrapper from '@components/ScreenWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import Log from '@libs/Log';
import getEmbeddedFlowOutcomeFromMessage from '@libs/WiseEmbeddedFlow/getEmbeddedFlowOutcomeFromMessage';
import getEmbeddedFlowOutcomeFromRedirect from '@libs/WiseEmbeddedFlow/getEmbeddedFlowOutcomeFromRedirect';
import messageBridgeScript from '@libs/WiseEmbeddedFlow/messageBridgeScript';
import type EmbeddedFlowOutcome from '@libs/WiseEmbeddedFlow/types';

import Navigation from '@navigation/Navigation';

import {setWiseKYCReviewFormError} from '@userActions/Wise';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import type {ShouldStartLoadRequest, WebViewMessageEvent} from 'react-native-webview/lib/WebViewTypes';

import React, {useRef} from 'react';
import {WebView} from 'react-native-webview';

/** Shows Wise's hosted KYC form in a WebView and leaves it once the form reports how it ended */
function WiseKYCReviewFormPage() {
    const {translate} = useLocalize();
    const [kycReviewURL] = useOnyx(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, {selector: (embeddedLink) => embeddedLink?.url});

    // Wise may both post a message and redirect when the form ends, so only the first one navigates
    const hasLeftFormRef = useRef(false);

    const goBack = () => Navigation.goBack();

    const leaveForm = (outcome: EmbeddedFlowOutcome) => {
        if (hasLeftFormRef.current) {
            return;
        }
        hasLeftFormRef.current = true;
        if (outcome === 'done') {
            // The approval replaces the form, so back from it does not reopen the form
            Navigation.navigate(ROUTES.WISE_KYC_COMPLETE, {forceReplace: true});
            return;
        }
        if (outcome === 'failed') {
            Log.hmmm('[Wise] The KYC review form could not continue');
            setWiseKYCReviewFormError();
        }
        goBack();
    };

    const leaveFormOnEndMessage = (event: WebViewMessageEvent) => {
        const outcome = getEmbeddedFlowOutcomeFromMessage(event.nativeEvent.data);
        if (!outcome) {
            return;
        }
        leaveForm(outcome);
    };

    // The redirect at the end of the flow points at the app's web page, so the WebView stops there instead of loading the web app
    const leaveFormOnRedirect = (request: ShouldStartLoadRequest) => {
        const outcome = getEmbeddedFlowOutcomeFromRedirect(request.url);
        if (!outcome) {
            return true;
        }
        leaveForm(outcome);
        return false;
    };

    const leaveFormOnLoadError = () => leaveForm('failed');

    const renderLoading = () => <LoadingIndicator />;

    return (
        <ScreenWrapper
            testID="WiseKYCReviewFormPage"
            shouldShowOfflineIndicator={false}
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            {/* The link lives only in memory, so a restored or deep linked screen has no form to show */}
            <FullPageNotFoundView
                shouldShow={!kycReviewURL}
                onBackButtonPress={goBack}
            >
                <Header>
                    <Header.BackButton onPress={goBack} />
                    <Header.Title title={translate('walletPage.wiseOnboarding.moreInfoNeeded.title')} />
                </Header>
                <FullPageOfflineBlockingView addBottomSafeAreaPadding>
                    <WebView
                        source={{uri: kycReviewURL ?? ''}}
                        injectedJavaScriptBeforeContentLoaded={messageBridgeScript}
                        onMessage={leaveFormOnEndMessage}
                        onShouldStartLoadWithRequest={leaveFormOnRedirect}
                        onError={leaveFormOnLoadError}
                        onHttpError={leaveFormOnLoadError}
                        // The form's ID document step films the user, so the camera preview has to play inline and the form's own host gets the camera without a second prompt
                        allowsInlineMediaPlayback
                        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
                        startInLoadingState
                        renderLoading={renderLoading}
                    />
                </FullPageOfflineBlockingView>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

export default WiseKYCReviewFormPage;

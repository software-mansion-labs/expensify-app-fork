/**
 * The status page content right after submit, while Wise checks the details and decides what comes next.
 */
import ConfirmationPage from '@components/ConfirmationPage';
import FixedFooter from '@components/FixedFooter';

import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';

function ReceivedContent() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const illustrations = useMemoizedLazyIllustrations(['FolderWithPapersAndWatch']);

    return (
        <ConfirmationPage>
            <ConfirmationPage.Content style={styles.ph5}>
                <ConfirmationPage.Illustration illustration={illustrations.FolderWithPapersAndWatch} />
                <ConfirmationPage.Heading>{translate('walletPage.wiseOnboarding.received.heading')}</ConfirmationPage.Heading>
                <ConfirmationPage.Description style={styles.textSupporting}>{translate('walletPage.wiseOnboarding.received.description')}</ConfirmationPage.Description>
            </ConfirmationPage.Content>
            <FixedFooter>
                {/* The next step is not known yet, so the button waits in the spot where Continue lands once Wise answers */}
                <ConfirmationPage.PrimaryButton
                    text={translate('common.continue')}
                    isDisabled
                    isLoading
                    sentryLabel={CONST.SENTRY_LABEL.WISE_MORE_INFO_NEEDED.CONTINUE}
                />
            </FixedFooter>
        </ConfirmationPage>
    );
}

export default ReceivedContent;

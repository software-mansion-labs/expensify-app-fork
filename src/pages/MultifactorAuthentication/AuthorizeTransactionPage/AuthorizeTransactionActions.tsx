import Button from '@components/Button';
import FixedFooter from '@components/FixedFooter';
import LoadingIndicator from '@components/LoadingIndicator';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import React from 'react';
import {View} from 'react-native';

type MultifactorAuthenticationAuthorizeTransactionActionsProps = {
    onAuthorize: () => void;
    onDeny: () => void;
    isLoading: boolean | undefined;

    /** Disables both decisions, e.g. offline, where neither could reach the server. */
    isDisabled?: boolean;
};

function MultifactorAuthenticationAuthorizeTransactionActions({onAuthorize, onDeny, isLoading, isDisabled}: MultifactorAuthenticationAuthorizeTransactionActionsProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <FixedFooter style={[styles.flexRow, styles.gap2]}>
            {isLoading ? (
                <View style={[styles.w100, styles.justifyContentCenter, {height: variables.componentSizeLarge}]}>
                    <LoadingIndicator iconSize={28} />
                </View>
            ) : (
                <>
                    <Button
                        danger
                        large
                        style={styles.flex1}
                        onPress={onDeny}
                        isDisabled={isDisabled}
                        text={translate('multifactorAuthentication.reviewTransaction.deny')}
                    />
                    <Button
                        success
                        large
                        style={styles.flex1}
                        onPress={onAuthorize}
                        isDisabled={isDisabled}
                        text={translate('multifactorAuthentication.reviewTransaction.approve')}
                    />
                </>
            )}
        </FixedFooter>
    );
}

MultifactorAuthenticationAuthorizeTransactionActions.displayName = 'MultifactorAuthenticationAuthorizeTransactionActions';

export default MultifactorAuthenticationAuthorizeTransactionActions;

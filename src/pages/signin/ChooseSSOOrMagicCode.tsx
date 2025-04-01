import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback} from 'react';
import {Keyboard, View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import Button from '@components/Button';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';
import useKeyboardState from '@hooks/useKeyboardState';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import * as ErrorUtils from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import * as HybridAppActions from '@userActions/HybridApp';
import * as Session from '@userActions/Session';
import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import ChangeExpensifyLoginLink from './ChangeExpensifyLoginLink';
import Terms from './Terms';

type ChooseSSOOrMagicCodeProps = {
    /** Function that returns whether the user is using SAML or magic codes to log in */
    setIsUsingMagicCode: (value: boolean) => void;
};

function ChooseSSOOrMagicCode({setIsUsingMagicCode}: ChooseSSOOrMagicCodeProps) {
    const styles = useThemeStyles();
    const {isKeyboardShown} = useKeyboardState();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const [credentials] = useOnyx(ONYXKEYS.CREDENTIALS);

    // This view doesn't have a field for user input, so dismiss the device keyboard if shown
    useFocusEffect(
        useCallback(() => {
            if (!isKeyboardShown) {
                return;
            }
            Keyboard.dismiss();
        }, [isKeyboardShown]),
    );

    return (
        <>
            <View>
                <Text style={[styles.loginHeroBody, styles.mb5, styles.textNormal, !shouldUseNarrowLayout ? styles.textAlignLeft : {}]}>{translate('samlSignIn.welcomeSAMLEnabled')}</Text>
                <Button
                    isDisabled={isOffline}
                    success
                    large
                    style={[styles.mv3]}
                    text={translate('samlSignIn.useSingleSignOn')}
                    isLoading={account?.isLoading}
                    onPress={() => {
                        HybridAppActions.setNewDotSignInState(CONST.HYBRID_APP_SIGN_IN_STATE.STARTED);
                        Navigation.navigate(ROUTES.SAML_SIGN_IN);
                    }}
                />

                <View style={[styles.mt5]}>
                    <Text style={[styles.loginHeroBody, styles.mb5, styles.textNormal, !shouldUseNarrowLayout ? styles.textAlignLeft : {}]}>
                        {translate('samlSignIn.orContinueWithMagicCode')}
                    </Text>
                </View>

                <Button
                    isDisabled={isOffline}
                    style={[styles.mv3]}
                    large
                    text={translate('samlSignIn.useMagicCode')}
                    isLoading={account?.isLoading && account?.loadingForm === (account?.requiresTwoFactorAuth ? CONST.FORMS.VALIDATE_TFA_CODE_FORM : CONST.FORMS.VALIDATE_CODE_FORM)}
                    onPress={() => {
                        Session.resendValidateCode(credentials?.login);
                        setIsUsingMagicCode(true);
                    }}
                />
                {!!account && !isEmptyObject(account.errors) && <FormHelpMessage message={ErrorUtils.getLatestErrorMessage(account)} />}
                <ChangeExpensifyLoginLink
                    onPress={() => {
                        if (CONFIG.IS_HYBRID_APP) {
                            HybridAppActions.resetSignInFlow();
                        }
                        Session.clearSignInData();
                    }}
                />
            </View>
            <View style={[styles.mt5, styles.signInPageWelcomeTextContainer]}>
                <Terms />
            </View>
        </>
    );
}

ChooseSSOOrMagicCode.displayName = 'ChooseSSOOrMagicCode';

export default ChooseSSOOrMagicCode;

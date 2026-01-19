import React, {useCallback, useImperativeHandle, useRef, useState} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import {View} from 'react-native';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import Text from '@components/Text';
import ValidateCodeCountdown from '@components/ValidateCodeCountdown';
import type {ValidateCodeCountdownHandle} from '@components/ValidateCodeCountdown/types';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';

type ValidateCodeResendButtonHandle = {
    resetCountdown: () => void;
};

type ValidateCodeResendButtonProps = {
    /** Ref for controlling the countdown */
    ref?: React.Ref<ValidateCodeResendButtonHandle>;

    /** Callback when resend button is pressed */
    onResendPress: () => void;

    /** Whether the resend button should be disabled */
    shouldDisableResend: boolean;

    /** Whether there is an error (shows different text) */
    hasError?: boolean;

    /** Style for the button */
    buttonStyle?: StyleProp<ViewStyle>;
};

function ValidateCodeResendButton({
    ref,
    onResendPress,
    shouldDisableResend,
    hasError = false,
    buttonStyle,
}: ValidateCodeResendButtonProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();

    const [isCountdownRunning, setIsCountdownRunning] = useState(true);
    const countdownRef = useRef<ValidateCodeCountdownHandle>(null);

    const handleCountdownFinish = useCallback(() => {
        setIsCountdownRunning(false);
    }, []);

    useImperativeHandle(ref, () => ({
        resetCountdown: () => {
            countdownRef.current?.resetCountdown();
            setIsCountdownRunning(true);
        },
    }));

    const resolvedButtonStyle = buttonStyle ?? styles.mt2;

    return (
        <View style={styles.alignItemsStart}>
            {isCountdownRunning && !isOffline ? (
                <View style={[resolvedButtonStyle, styles.flexRow, styles.renderHTML]}>
                    <ValidateCodeCountdown
                        ref={countdownRef}
                        onCountdownFinish={handleCountdownFinish}
                    />
                </View>
            ) : (
                <PressableWithFeedback
                    style={resolvedButtonStyle}
                    onPress={onResendPress}
                    disabled={shouldDisableResend}
                    hoverDimmingValue={1}
                    pressDimmingValue={0.2}
                    role={CONST.ROLE.BUTTON}
                    accessibilityLabel={translate('validateCodeForm.magicCodeNotReceived')}
                >
                    <Text style={StyleUtils.getDisabledLinkStyles(shouldDisableResend)}>
                        {hasError ? translate('validateCodeForm.requestNewCodeAfterErrorOccurred') : translate('validateCodeForm.magicCodeNotReceived')}
                    </Text>
                </PressableWithFeedback>
            )}
        </View>
    );
}

ValidateCodeResendButton.displayName = 'ValidateCodeResendButton';

export default ValidateCodeResendButton;

export type {ValidateCodeResendButtonHandle};

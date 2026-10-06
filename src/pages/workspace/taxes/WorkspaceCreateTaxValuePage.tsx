import Button from '@components/Button';
import FullScreenAmountLayout from '@components/FullScreenAmountLayout';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import NumericInput from '@components/NumericInput';
import ScreenWrapper from '@components/ScreenWrapper';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {setDraftValues} from '@libs/actions/FormActions';
import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import TransitionTracker from '@libs/Navigation/TransitionTracker';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';

import variables from '@styles/variables';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/WorkspaceNewTaxForm';

import {useFocusEffect} from '@react-navigation/native';
import React, {useRef, useState} from 'react';

const canUseTouchScreen = canUseTouchScreenUtil();

type WorkspaceCreateTaxValuePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAX_CREATE_VALUE>;

function WorkspaceCreateTaxValuePage({
    route: {
        params: {policyID},
    },
}: WorkspaceCreateTaxValuePageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const [formDraft] = useOnyx(ONYXKEYS.FORMS.WORKSPACE_NEW_TAX_FORM_DRAFT);
    const [currentValue, setCurrentValue] = useState(formDraft?.[INPUT_IDS.VALUE]);

    const goBack = () => Navigation.goBack(ROUTES.WORKSPACE_TAX_CREATE.getRoute(policyID));

    const save = () => {
        const normalizedValue = currentValue !== undefined ? String(Number(currentValue)) : currentValue;
        setDraftValues(ONYXKEYS.FORMS.WORKSPACE_NEW_TAX_FORM, {[INPUT_IDS.VALUE]: normalizedValue});
        Navigation.goBack(ROUTES.WORKSPACE_TAX_CREATE.getRoute(policyID), {shouldSkipFocusRestore: true});
    };

    const inputRef = useRef<BaseTextInputRef | null>(null);
    useFocusEffect(() => {
        const handle = TransitionTracker.runAfterTransitions({
            callback: () => inputRef.current?.focus(),
            waitForUpcomingTransition: true,
        });
        return () => handle.cancel();
    });

    return (
        <ScreenWrapper
            enableEdgeToEdgeBottomSafeAreaPadding
            testID="WorkspaceCreateTaxValuePage"
            shouldEnableMaxHeight
        >
            <HeaderWithBackButton
                title={translate('workspace.taxes.value')}
                onBackButtonPress={goBack}
            />
            <NumericInput
                value={currentValue}
                onInputChange={setCurrentValue}
                decimals={CONST.MAX_TAX_RATE_DECIMAL_PLACES}
                maxLength={CONST.MAX_TAX_RATE_INTEGER_PLACES}
            >
                <FullScreenAmountLayout>
                    <FullScreenAmountLayout.Body>
                        <FullScreenAmountLayout.Main>
                            <NumericInput.Container>
                                <NumericInput.TextInput
                                    autoGrowExtraSpace={variables.w80}
                                    autoGrowMarginSide="left"
                                    style={[styles.iouAmountTextInput, styles.textAlignRight]}
                                    containerStyle={styles.iouAmountTextInputContainer}
                                    touchableInputWrapperStyle={styles.heightUndefined}
                                    ref={inputRef}
                                />
                                <NumericInput.Symbol>%</NumericInput.Symbol>
                            </NumericInput.Container>
                        </FullScreenAmountLayout.Main>
                        <FullScreenAmountLayout.Pad>
                            <NumericInput.BigNumberPad />
                        </FullScreenAmountLayout.Pad>
                    </FullScreenAmountLayout.Body>
                    <FullScreenAmountLayout.Footer>
                        <Button
                            variant={CONST.BUTTON_VARIANT.SUCCESS}
                            size={CONST.BUTTON_SIZE.LARGE}
                            onPress={save}
                            // On touch screens the button sits right under the number pad, so it keeps a gap from the keys
                            style={[styles.w100, canUseTouchScreen ? styles.mt5 : styles.mt0]}
                        >
                            <Button.KeyboardShortcut />
                            <Button.Text>{translate('common.save')}</Button.Text>
                        </Button>
                    </FullScreenAmountLayout.Footer>
                </FullScreenAmountLayout>
            </NumericInput>
        </ScreenWrapper>
    );
}

export default WorkspaceCreateTaxValuePage;

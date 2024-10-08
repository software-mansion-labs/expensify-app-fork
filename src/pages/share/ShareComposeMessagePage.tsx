import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import OptionRow from '@components/OptionRow';
import RNFS from '@components/ProfilingToolMenu/RNFS';
import type {AnimatedTextInputRef} from '@components/RNTextInput';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import {readFileAsync} from '@libs/fileDownload/FileUtils';
import type {OptionData} from '@libs/ReportUtils';
import Navigation from '@navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ShareComposeMessageForm} from '@src/types/form/ShareComposeMessageForm';
import INPUT_IDS from '@src/types/form/ShareComposeMessageForm';

export default function ShareComposeMessagePage() {
    const inputRef = useRef<AnimatedTextInputRef>(null);

    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const navigateBack = () => {
        Navigation.goBack();
    };
    const [shareFile] = useOnyx(ONYXKEYS.SHARE_FILE);
    // eslint-disable-next-line no-console
    console.log('SHARE FILE TO ', shareFile?.fileData);
    const {content = '/data/user/0/com.expensify.chat.dev/files/Expensify/17279539648432578489745976400274.jpg'} = shareFile?.fileData || {};
    const examplePath = '/data/user/0/com.expensify.chat.dev/files/Expensify/17279539648432578489745976400274.jpg';
    const fileData = readFileAsync(examplePath, 'test', (x) => {
        console.log('FILE DATA ', x);
    });

    console.log('FILE DATA ', fileData);

    function updateMessage(message: ShareComposeMessageForm) {
        // eslint-disable-next-line no-console
        console.log('MESSSAGE ', message);
    }

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableKeyboardAvoidingView={false}
            shouldEnableMinHeight={DeviceCapabilities.canUseTouchScreen()}
            testID={ShareComposeMessagePage.displayName}
        >
            <HeaderWithBackButton
                title={translate('share.title')}
                onBackButtonPress={navigateBack}
            />
            <View style={[styles.flex1]}>
                <View style={[styles.ph6, styles.flexRow, styles.justifyContentBetween, styles.alignItemsCenter]}>
                    <Text
                        style={styles.label}
                        color={theme.textSupporting}
                    >
                        {translate('common.to')}
                    </Text>
                </View>
                {shareFile?.receiver && (
                    <OptionRow
                        option={shareFile.receiver}
                        boldStyle
                    />
                )}
                <FormProvider
                    style={[styles.mh5, styles.flexGrow1, styles.flexColumn]}
                    formID={ONYXKEYS.FORMS.SHARE_COMPOSE_MESSAGE_FORM}
                    onSubmit={(values) => updateMessage(values)}
                    submitButtonText={translate('common.share')}
                    enabledWhenOffline
                >
                    <InputWrapper
                        style={[styles.flexGrow1, styles.flexColumn]}
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.MESSAGE}
                        name={INPUT_IDS.MESSAGE}
                        defaultValue={undefined}
                        label="Message"
                        accessibilityLabel="Message"
                        ref={inputRef}
                        role={CONST.ROLE.PRESENTATION}
                        maxLength={10000}
                        multiline
                    />
                </FormProvider>
                {/* <AttachmentView
                    source={item.source}
                    file={item.file}
                    isAuthTokenRequired={item.isAuthTokenRequired}
                    isUsedInCarousel
                    isSingleCarouselItem={isSingleItem}
                    carouselItemIndex={index}
                    carouselActiveItemIndex={activeIndex}
                    onPress={onPress}
                    transactionID={item.transactionID}
                /> */}
            </View>
        </ScreenWrapper>
    );
}

ShareComposeMessagePage.displayName = 'ShareComposeMessagePage';

/** A boolean answered by downloading a document the user must have, such as terms they need to read, so the answer turns on with the download */
import Button from '@components/Button';
import FormHelpMessage from '@components/FormHelpMessage';

import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {openExternalLink} from '@userActions/Link';

import CONST from '@src/CONST';

import type {ComponentRef, Ref} from 'react';

import React from 'react';
import {View} from 'react-native';

type DocumentDownloadAdapterProps = {
    /** Called with `true` once the user opens the document */
    onInputChange?: (value: boolean) => void;

    /** Where the document sits in the App, such as `/pdfs/terms.pdf` */
    documentPath: string;

    /** The field label, read out by screen readers as the button's name */
    accessibilityLabel: string;

    /** Validation error shown under the button */
    errorText?: string;

    /** Lets FormProvider scroll to the field when the user asks to fix the errors */
    ref?: Ref<ComponentRef<typeof View>>;
};

function DocumentDownloadAdapter({onInputChange = () => {}, documentPath, accessibilityLabel, errorText, ref}: DocumentDownloadAdapterProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {environmentURL} = useEnvironment();

    return (
        <View
            ref={ref}
            style={styles.alignItemsStart}
        >
            <Button
                sentryLabel={CONST.SENTRY_LABEL.DYNAMIC_FORM.DOCUMENT_DOWNLOAD}
                accessibilityLabel={accessibilityLabel}
                onPress={() => {
                    openExternalLink(`${environmentURL}${documentPath}`);
                    onInputChange(true);
                }}
            >
                <Button.Text>{translate('common.download')}</Button.Text>
            </Button>
            <FormHelpMessage message={errorText} />
        </View>
    );
}

export default DocumentDownloadAdapter;

import React from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import ONYXKEYS from '@src/ONYXKEYS';
import AuthorizeCardTransactionPreview from './AuthorizeCardTransactionPreview';

type MultifactorAuthenticationAuthorizeTransactionContentProps = {
    transactionID: string;
};

function MultifactorAuthenticationAuthorizeTransactionContent({transactionID}: MultifactorAuthenticationAuthorizeTransactionContentProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [authorizeTransaction] = useOnyx(`${ONYXKEYS.COLLECTION.AUTHORIZE_TRANSACTION}${getNonEmptyStringOnyxID(transactionID)}`, {canBeMissing: true});

    return (
        <View style={styles.mh5}>
            <View style={[styles.gap2, styles.mb6]}>
                <Text style={styles.textHeadlineLineHeightXXL}>{translate('multifactorAuthentication.reviewTransaction.pleaseReview')}</Text>
                <Text style={styles.textSupporting}>{translate('multifactorAuthentication.reviewTransaction.requiresYourReview')}</Text>
            </View>
            <View style={styles.mb2}>
                <Text style={styles.textMicroSupporting}>{translate('multifactorAuthentication.reviewTransaction.transactionDetails')}</Text>
            </View>
            <AuthorizeCardTransactionPreview
                transactionID={transactionID}
                amount={authorizeTransaction?.amount}
                currency={authorizeTransaction?.currency}
                merchant={authorizeTransaction?.merchant}
                created={authorizeTransaction?.created}
                lastFourPAN={authorizeTransaction?.lastFourPAN}
            />
        </View>
    );
}

MultifactorAuthenticationAuthorizeTransactionContent.displayName = 'MultifactorAuthenticationAuthorizeTransactionContent';

export default MultifactorAuthenticationAuthorizeTransactionContent;

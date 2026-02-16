import React from 'react';
import {View} from 'react-native';
import EReceiptWithSizeCalculation from '@components/EReceiptWithSizeCalculation';
import Icon from '@components/Icon';
import * as eReceiptBGs from '@components/Icon/EReceiptBGs';
import {CreditCardExclamation} from '@components/Icon/Expensicons';
import Text from '@components/Text';
import TransactionPreviewSkeletonView from '@components/TransactionPreviewSkeletonView';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {convertToDisplayString} from '@libs/CurrencyUtils';
import DateUtils from '@libs/DateUtils';
import {formatLastFourPAN} from '@libs/TransactionPreviewUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';

type AuthorizeCardTransactionPreviewProps = {
    transactionID?: string;
    amount?: number;
    currency?: string;
    merchant?: string;
    created?: string;
    lastFourPAN?: number;
};

function AuthorizeCardTransactionPreview({transactionID, amount, currency, merchant, created, lastFourPAN}: AuthorizeCardTransactionPreviewProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const theme = useTheme();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const icons = useMemoizedLazyExpensifyIcons(['CreditCard', 'ReceiptBody']);

    const reportPreviewStyles = StyleUtils.getMoneyRequestReportPreviewStyle(shouldUseNarrowLayout, 1);
    const transactionPreviewWidth = reportPreviewStyles.transactionPreviewStandaloneStyle.width;

    const shouldShowSkeleton = !amount && !currency && !merchant && !created && !lastFourPAN;
    if (shouldShowSkeleton) {
        return (
            <View style={[styles.border, styles.moneyRequestPreviewBox, reportPreviewStyles.transactionPreviewStandaloneStyle]}>
                <TransactionPreviewSkeletonView transactionPreviewWidth={transactionPreviewWidth} />
            </View>
        );
    }

    const formattedDate = created
        ? DateUtils.formatWithUTCTimeZone(created, DateUtils.doesDateBelongToAPastYear(created) ? CONST.DATE.MONTH_DAY_YEAR_ABBR_FORMAT : CONST.DATE.MONTH_DAY_ABBR_FORMAT)
        : '';
    const headerText = [formattedDate, translate('common.card')].filter(Boolean).join(` ${CONST.DOT_SEPARATOR} `);
    const displayAmount = amount === undefined ? '' : convertToDisplayString(amount, currency ?? '');

    const formattedLastFourPAN = formatLastFourPAN(lastFourPAN);
    const shouldShowCardEnding = !!formattedLastFourPAN;
    const cardEndingText = shouldShowCardEnding ? `${translate('paymentMethodList.accountLastFour')} ${formattedLastFourPAN}` : '';
    const shouldShowMerchantOrDescription = !!merchant;
    const shouldWrapDisplayAmount = !shouldShowMerchantOrDescription;
    const shouldShowCategoryOrTag = shouldShowCardEnding;
    const previewTextViewGap = (shouldShowCategoryOrTag || !shouldWrapDisplayAmount) && styles.gap2;

    const colorStyles = StyleUtils.getEReceiptColorStyles(CONST.ERECEIPT_COLORS.GREEN);
    const primaryColor = colorStyles?.backgroundColor;
    const secondaryColor = colorStyles?.color;
    const titleColor = colorStyles?.titleColor;
    const MCCIcon = CreditCardExclamation;
    const backgroundImage = eReceiptBGs.EReceiptBG_Green;
    const titleText = translate('multifactorAuthentication.reviewTransaction.attemptedTransaction');

    return (
        <View style={[styles.border, styles.moneyRequestPreviewBox, reportPreviewStyles.transactionPreviewStandaloneStyle]}>
            <View style={styles.reportActionItemImagesContainer}>
                <View style={[styles.reportActionItemImages, StyleUtils.getHeight(variables.previewEReceiptHeight)]}>
                    <EReceiptWithSizeCalculation
                        transactionID={transactionID}
                        receiptType="default"
                        overrideTheme={{
                            primaryColor,
                            secondaryColor,
                            titleColor,
                            MCCIcon,
                            backgroundImage,
                            titleText,
                        }}
                    />
                </View>
            </View>
            <View style={[styles.expenseAndReportPreviewBoxBody, styles.mtn1]}>
                <View style={styles.gap3}>
                    <View style={previewTextViewGap}>
                        <View style={[styles.flexRow, styles.alignItemsCenter]}>
                            <Text
                                style={[styles.textLabelSupporting, styles.flex1, styles.lh16]}
                                numberOfLines={1}
                            >
                                {headerText}
                            </Text>
                            {shouldWrapDisplayAmount && !!displayAmount && (
                                <Text
                                    fontSize={variables.fontSizeNormal}
                                    style={styles.flexShrink0}
                                    numberOfLines={1}
                                >
                                    {displayAmount}
                                </Text>
                            )}
                        </View>
                        <View>
                            <View style={[styles.flexRow]}>
                                <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter, styles.justifyContentBetween, styles.gap2]}>
                                    {shouldShowMerchantOrDescription && (
                                        <Text
                                            fontSize={variables.fontSizeNormal}
                                            style={styles.flexShrink1}
                                            numberOfLines={1}
                                        >
                                            {merchant}
                                        </Text>
                                    )}
                                    {!shouldWrapDisplayAmount && !!displayAmount && (
                                        <Text
                                            fontSize={variables.fontSizeNormal}
                                            style={styles.flexShrink0}
                                            numberOfLines={1}
                                        >
                                            {displayAmount}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                        {shouldShowCategoryOrTag && (
                            <View style={[styles.flexRow, styles.alignItemsCenter]}>
                                <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap1, styles.flexShrink1]}>
                                    <Icon
                                        src={icons.CreditCard}
                                        height={variables.iconSizeExtraSmall}
                                        width={variables.iconSizeExtraSmall}
                                        fill={theme.icon}
                                    />
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.textMicroSupporting, styles.pre, styles.flexShrink1]}
                                    >
                                        {cardEndingText}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
}

export default AuthorizeCardTransactionPreview;

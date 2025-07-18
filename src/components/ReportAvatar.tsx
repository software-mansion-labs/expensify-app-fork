import React from 'react';
import type { ColorValue, ViewStyle } from 'react-native';
import { View } from 'react-native';
import type { OnyxEntry } from 'react-native-onyx';
import type { ValueOf } from 'type-fest';
import useOnyx from '@hooks/useOnyx';
import useReportIsArchived from '@hooks/useReportIsArchived';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import getIconDetails from '@libs/getAvatarDetails';
import { isChatReport, shouldReportShowSubscript } from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type { ReportAction } from '@src/types/onyx';
import type { Icon as IconType } from '@src/types/onyx/OnyxCommon';
import type IconAsset from '@src/types/utils/IconAsset';
import Avatar from './Avatar';
import Icon from './Icon';
import type { MultipleAvatarsProps } from './MultipleAvatars';
import MultipleAvatars from './MultipleAvatars';
import UserDetailsTooltip from './UserDetailsTooltip';
import {getAvatarsForAccountIDs} from "@libs/OptionsListUtils";


type SubIcon = {
    /** Avatar source to display */
    source: IconAsset;

    /** Width of the icon */
    width?: number;

    /** Height of the icon */
    height?: number;

    /** The fill color for the icon. Can be hex, rgb, rgba, or valid react-native named color such as 'red' or 'blue'. */
    fill?: string;
};

type ReportAvatarProps = MultipleAvatarsProps & {
    /** IOU Report ID for single avatar */
    reportID?: string;

    /** IOU Report ID for single avatar */
    action?: OnyxEntry<ReportAction>;

    /** Single avatar size */
    singleAvatarSize?: ValueOf<typeof CONST.AVATAR_SIZE>;

    /** Single avatar container styles */
    singleAvatarContainerStyle?: ViewStyle[];

    /** Border color for the subscript avatar */
    subscriptBorderColor?: ColorValue;

    /** Whether to show the subscript avatar without margin */
    subscriptNoMargin?: boolean;

    /** Subscript icon to display */
    subIcon?: SubIcon;

    /** A fallback main avatar icon */
    subscriptFallbackIcon?: IconType;

    /** Size of the secondary avatar */
    subscriptAvatarSize?: ValueOf<typeof CONST.AVATAR_SIZE>;

    accountIDs?: number[];
};

function ReportAvatar({
    reportID,
    singleAvatarContainerStyle,
    singleAvatarSize,
    subscriptBorderColor,
    subscriptNoMargin = false,
    subIcon,
    subscriptFallbackIcon,
    subscriptAvatarSize = CONST.AVATAR_SIZE.SUBSCRIPT,
    accountIDs: passedAccountIDs,
    action,
    ...multipleAvatarsProps
}: Omit<ReportAvatarProps, 'icons'>) {
    const {size = CONST.AVATAR_SIZE.DEFAULT, shouldShowTooltip = true} = multipleAvatarsProps;
    const theme = useTheme();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();

    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`, {canBeMissing: true});

    const [chatReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${report?.chatReportID}`, {canBeMissing: true});

    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {
        canBeMissing: true,
    });
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {canBeMissing: true});

    const [chatReportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport?.reportID ?? report?.chatReportID}`, {canBeMissing: true});
    const [reportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report?.reportID}`, {canBeMissing: true});
    const [allTransactions] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION, {
        canBeMissing: true,
    });

    const {
        primaryAvatar,
        secondaryAvatar,
        reportPreviewSenderID,
        isWorkspaceActor,
        fallbackIcon: reportFallbackIcon,
        reportPreviewAction,
        delegatePersonalDetails,
        actorAccountID,
        shouldDisplayAllActors,
    } = getIconDetails({
        iouReport: isChatReport(report) ? undefined : report,
        chatReport: isChatReport(report) ? report : chatReport,
        action,
        personalDetails,
        policies,
        chatReportActions,
        reportActions,
        allTransactions,
    });

    const isReportArchived = useReportIsArchived(reportID);
    const shouldShowSubscriptAvatar = shouldReportShowSubscript(report, isReportArchived);

    if (shouldShowSubscriptAvatar) {
        const isSmall = size === CONST.AVATAR_SIZE.SMALL;
        const subscriptStyle = size === CONST.AVATAR_SIZE.SMALL_NORMAL ? styles.secondAvatarSubscriptSmallNormal : styles.secondAvatarSubscript;
        const containerStyle = StyleUtils.getContainerStyles(size);

        const mainAvatar = primaryAvatar ?? subscriptFallbackIcon;

        return (
            <View
                style={[containerStyle, subscriptNoMargin ? styles.mr0 : {}]}
                testID="SubscriptAvatar"
            >
                <UserDetailsTooltip
                    shouldRender={shouldShowTooltip}
                    accountID={Number(mainAvatar?.id ?? CONST.DEFAULT_NUMBER_ID)}
                    icon={mainAvatar}
                    fallbackUserDetails={{
                        displayName: mainAvatar?.name,
                    }}
                >
                    <View>
                        <Avatar
                            containerStyles={StyleUtils.getWidthAndHeightStyle(StyleUtils.getAvatarSize(size || CONST.AVATAR_SIZE.DEFAULT))}
                            source={mainAvatar?.source}
                            size={size}
                            name={mainAvatar?.name}
                            avatarID={mainAvatar?.id}
                            type={mainAvatar?.type}
                            fallbackIcon={mainAvatar?.fallbackIcon}
                        />
                    </View>
                </UserDetailsTooltip>
                {!!secondaryAvatar && (
                    <UserDetailsTooltip
                        shouldRender={shouldShowTooltip}
                        accountID={Number(secondaryAvatar.id ?? CONST.DEFAULT_NUMBER_ID)}
                        icon={secondaryAvatar}
                    >
                        <View
                            style={[size === CONST.AVATAR_SIZE.SMALL_NORMAL ? styles.flex1 : {}, isSmall ? styles.secondAvatarSubscriptCompact : subscriptStyle]}
                            // Hover on overflowed part of icon will not work on Electron if dragArea is true
                            // https://stackoverflow.com/questions/56338939/hover-in-css-is-not-working-with-electron
                            dataSet={{dragArea: false}}
                        >
                            <Avatar
                                iconAdditionalStyles={[
                                    StyleUtils.getAvatarBorderWidth(isSmall ? CONST.AVATAR_SIZE.SMALL_SUBSCRIPT : subscriptAvatarSize),
                                    StyleUtils.getBorderColorStyle(subscriptBorderColor ?? theme.componentBG),
                                ]}
                                source={secondaryAvatar.source}
                                size={isSmall ? CONST.AVATAR_SIZE.SMALL_SUBSCRIPT : subscriptAvatarSize}
                                fill={secondaryAvatar.fill}
                                name={secondaryAvatar.name}
                                avatarID={secondaryAvatar.id}
                                type={secondaryAvatar.type}
                                fallbackIcon={secondaryAvatar.fallbackIcon}
                            />
                        </View>
                    </UserDetailsTooltip>
                )}
                {!!subIcon && (
                    <View
                        style={[
                            size === CONST.AVATAR_SIZE.SMALL_NORMAL ? styles.flex1 : {},
                            // Nullish coalescing thinks that empty strings are truthy, thus I'm using OR operator
                            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                            StyleUtils.getBorderColorStyle(subscriptBorderColor || theme.sidebar),
                            StyleUtils.getAvatarSubscriptIconContainerStyle(subIcon.width, subIcon.height),
                            styles.dFlex,
                            styles.justifyContentCenter,
                        ]}
                        // Hover on overflowed part of icon will not work on Electron if dragArea is true
                        // https://stackoverflow.com/questions/56338939/hover-in-css-is-not-working-with-electron
                        dataSet={{dragArea: false}}
                    >
                        <Icon
                            src={subIcon.source}
                            width={subIcon.width}
                            height={subIcon.height}
                            additionalStyles={styles.alignSelfCenter}
                            fill={subIcon.fill}
                        />
                    </View>
                )}
            </View>
        );
    }

    if (passedAccountIDs || (shouldDisplayAllActors && !reportPreviewSenderID)) {
        const icons = getAvatarsForAccountIDs(passedAccountIDs ?? [], personalDetails);

        return (
            <MultipleAvatars
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...multipleAvatarsProps}
                icons={icons ?? [primaryAvatar, secondaryAvatar]}
            />
        );
    }

    return (
        <UserDetailsTooltip
            accountID={Number(delegatePersonalDetails && !isWorkspaceActor ? actorAccountID : (primaryAvatar.id ?? CONST.DEFAULT_NUMBER_ID))}
            delegateAccountID={reportPreviewAction?.delegateAccountID}
            icon={primaryAvatar}
        >
            <View>
                <Avatar
                    containerStyles={singleAvatarContainerStyle}
                    source={primaryAvatar.source}
                    type={primaryAvatar.type}
                    name={primaryAvatar.name}
                    avatarID={primaryAvatar.id}
                    size={singleAvatarSize ?? size}
                    fallbackIcon={reportFallbackIcon}
                />
            </View>
        </UserDetailsTooltip>
    );
}

export default ReportAvatar;

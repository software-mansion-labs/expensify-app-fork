import React from 'react';
import type {ColorValue, ViewStyle} from 'react-native';
import {View} from 'react-native';
import type {ValueOf} from 'type-fest';
import useOnyx from '@hooks/useOnyx';
import useReportAvatarDetails from '@hooks/useReportAvatarDetails';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Icon} from '@src/types/onyx/OnyxCommon';
import Avatar from './Avatar';
import type {MultipleAvatarsProps} from './MultipleAvatars';
import MultipleAvatars from './MultipleAvatars';
import type {SubIcon} from './SubscriptAvatar';
import SubscriptAvatar from './SubscriptAvatar';
import UserDetailsTooltip from './UserDetailsTooltip';
import useReportIsArchived from "@hooks/useReportIsArchived";
import {isMoneyRequestReport, shouldReportShowSubscript} from "@libs/ReportUtils";

type ReportAvatarProps = MultipleAvatarsProps & {
    /** IOU Report ID for single avatar */
    reportID?: string;



    /** Single avatar size */
    singleAvatarSize?: ValueOf<typeof CONST.AVATAR_SIZE>;

    /** Single avatar container styles */
    singleAvatarContainerStyle?: ViewStyle[];

    /** Whether to show the subscript avatar */
    shouldShowSubscript: boolean;

    /** Border color for the subscript avatar */
    subscriptBorderColor?: ColorValue;

    /** Whether to show the subscript avatar without margin */
    subscriptNoMargin?: boolean;

    /** Subscript icon to display */
    subIcon?: SubIcon;

    /** A fallback main avatar icon */
    subscriptFallbackIcon?: Icon;

    /** Size of the secondary avatar */
    subscriptAvatarSize?: ValueOf<typeof CONST.AVATAR_SIZE>;
};

function ReportAvatar({
    reportID,

    singleAvatarContainerStyle,
    singleAvatarSize,
    shouldShowSubscript,
    subscriptBorderColor,
    subscriptNoMargin,
    subIcon,
    subscriptFallbackIcon,
    subscriptAvatarSize,
    ...multipleAvatarsProps
}: ReportAvatarProps) {
    const {icons = [], size = CONST.AVATAR_SIZE.DEFAULT, shouldShowTooltip = true} = multipleAvatarsProps;

    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`, {canBeMissing: true});
    const [chatReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${report?.chatReportID}`, {canBeMissing: true});


    // const [iouReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${iouReportID}`, {canBeMissing: true});
    // const [chatReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${chatReportID ?? iouReport?.chatReportID}`, {canBeMissing: true});

    const {
        primaryAvatar,
        reportPreviewSenderID,
        isWorkspaceActor,
        fallbackIcon: reportFallbackIcon,
        reportPreviewAction,
        delegatePersonalDetails,
        actorAccountID,
        accountID,
        shouldDisplayAllActors,
    } = useReportAvatarDetails(isMoneyRequestReport(report) ? {iouReport: report, chatReport} : {chatReport: report, iouReport: undefined});

    const isReportArchived = useReportIsArchived(reportID);
    const shouldShowSubscriptAvatar = shouldReportShowSubscript(report, isReportArchived);
    
    const shouldShowSingleAvatar = !!reportPreviewSenderID && !shouldDisplayAllActors && !shouldShowSubscript;

    const subscriptMainAvatar = icons.at(0) ?? subscriptFallbackIcon;

    if (shouldShowSubscript) {

        return (
            <SubscriptAvatar
                showTooltip={shouldShowTooltip}
                size={size}
                mainAvatar={subscriptMainAvatar}
                secondaryAvatar={icons.at(1)}
                backgroundColor={subscriptBorderColor}
                noMargin={subscriptNoMargin}
                subscriptIcon={subIcon}
                secondaryAvatarSize={subscriptAvatarSize}
            />
        );
    }

    if (shouldDisplayAllActors) {
        console.log("MHM")
        return (
            <MultipleAvatars
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...multipleAvatarsProps}
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

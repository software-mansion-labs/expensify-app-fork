import React from 'react';
import type {ColorValue, ViewStyle} from 'react-native';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import useOnyx from '@hooks/useOnyx';
import useReportAvatarDetails from '@hooks/useReportAvatarDetails';
import useReportIsArchived from '@hooks/useReportIsArchived';
import {isChatReport, shouldReportShowSubscript} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction} from '@src/types/onyx';
import type {Icon} from '@src/types/onyx/OnyxCommon';
import Avatar from './Avatar';
import type {MultipleAvatarsProps} from './MultipleAvatars';
import MultipleAvatars from './MultipleAvatars';
import type {SubIcon} from './SubscriptAvatar';
import SubscriptAvatar from './SubscriptAvatar';
import UserDetailsTooltip from './UserDetailsTooltip';

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
    subscriptFallbackIcon?: Icon;

    /** Size of the secondary avatar */
    subscriptAvatarSize?: ValueOf<typeof CONST.AVATAR_SIZE>;
};

function ReportAvatar({
    reportID,
    singleAvatarContainerStyle,
    singleAvatarSize,
    subscriptBorderColor,
    subscriptNoMargin,
    subIcon,
    subscriptFallbackIcon,
    subscriptAvatarSize,
    action,
    ...multipleAvatarsProps
}: Omit<ReportAvatarProps, 'icons'>) {
    const {size = CONST.AVATAR_SIZE.DEFAULT, shouldShowTooltip = true} = multipleAvatarsProps;

    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`, {canBeMissing: true});

    const [chatReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${report?.chatReportID}`, {canBeMissing: true});

    const hookArguments = {
        iouReport: isChatReport(report) ? undefined : report,
        chatReport: isChatReport(report) ? report : chatReport,
        action,
        usePersonalDetailsAvatars: isChatReport(report),
    };

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
    } = useReportAvatarDetails(hookArguments);

    const isReportArchived = useReportIsArchived(reportID);
    const shouldShowSubscriptAvatar = shouldReportShowSubscript(report, isReportArchived);

    if (shouldShowSubscriptAvatar) {
        return (
            <SubscriptAvatar
                showTooltip={shouldShowTooltip}
                size={size}
                mainAvatar={primaryAvatar ?? subscriptFallbackIcon}
                secondaryAvatar={secondaryAvatar}
                backgroundColor={subscriptBorderColor}
                noMargin={subscriptNoMargin}
                subscriptIcon={subIcon}
                secondaryAvatarSize={subscriptAvatarSize}
            />
        );
    }

    if (shouldDisplayAllActors && !reportPreviewSenderID) {
        return (
            <MultipleAvatars
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...multipleAvatarsProps}
                icons={[primaryAvatar, secondaryAvatar]}
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

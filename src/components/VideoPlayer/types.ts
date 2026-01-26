import type {VideoPlayer} from 'expo-video';
import type {StyleProp, ViewStyle} from 'react-native';
import type {ValueOf} from 'type-fest';
import type CONST from '@src/CONST';

type VideoPlayerProps = {
    url: string;
    onVideoLoaded?: () => void;
    resizeMode?: string;
    isLooping?: boolean;
    // style for the whole video player component
    style?: StyleProp<ViewStyle>;
    // style for the video player inside the component
    videoPlayerStyle?: StyleProp<ViewStyle>;
    // style for the video element inside the video player
    videoStyle?: StyleProp<ViewStyle>;
    videoControlsStyle?: StyleProp<ViewStyle>;
    videoDuration?: number;
    shouldUseSharedVideoElement?: boolean;
    shouldUseSmallVideoControls?: boolean;
    shouldShowVideoControls?: boolean;
    isVideoHovered?: boolean;
    onFullscreenEnter?: () => void;
    onFullscreenExit?: () => void;
    onPlaybackStatusUpdate?: (status: VideoPlaybackStatus) => void;
    shouldUseControlsBottomMargin?: boolean;
    controlsStatus?: ValueOf<typeof CONST.VIDEO_PLAYER.CONTROLS_STATUS>;
    shouldPlay?: boolean;
    isPreview?: boolean;
    reportID?: string;
    onTap?: (shouldShowArrows?: boolean) => void;
};

type VideoPlaybackStatus = {
    isPlaying: boolean;
    isLoaded: boolean;
    isBuffering: boolean;
    didJustFinish: boolean;
    currentTime: number;
    duration: number;
    error?: Error;
};

export type {VideoPlayerProps, VideoPlaybackStatus, VideoPlayer};

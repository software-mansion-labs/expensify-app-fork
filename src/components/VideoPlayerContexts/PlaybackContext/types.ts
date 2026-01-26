import type {VideoPlayer} from 'expo-video';
import type {RefObject} from 'react';
import type {View} from 'react-native';

type StatusCallback = (isPlaying: boolean) => void;
type OriginalParent = View | HTMLDivElement | null;
type UnloadVideo = () => void;
type StopVideo = () => void;

type VideoElementData = {
    shouldUseSharedVideoElement: boolean;
    url: string;
    reportID: string | undefined;
};

type PlaybackContextValues = {
    updateCurrentURLAndReportID: (url: string | undefined, reportID: string | undefined) => void;
    currentlyPlayingURL: string | null;
    currentRouteReportID: string | undefined;
    originalParent: View | HTMLDivElement | null;
    sharedElement: View | HTMLDivElement | null;
    shareVideoPlayerElements: (
        player: VideoPlayer | null,
        parent: View | HTMLDivElement | null,
        child: View | HTMLDivElement | null,
        isUploading: boolean,
        videoElementData: VideoElementData,
    ) => void;
    setCurrentlyPlayingURL: React.Dispatch<React.SetStateAction<string | null>>;
};

type PlaybackContextVideoRefs = {
    resetPlayerData: () => void;
    play: () => void;
    pause: () => void;
    stop: () => void;
    isPlaying: (statusCallback: StatusCallback) => void;
    resumeTryNumberRef: RefObject<number>;
    ref: RefObject<VideoPlayer | null>;
    updateRef: (player: VideoPlayer | null) => void;
};

type PlaybackContext = PlaybackContextValues & {
    resetVideoPlayerData: PlaybackContextVideoRefs['resetPlayerData'];
    playVideo: PlaybackContextVideoRefs['play'];
    pauseVideo: PlaybackContextVideoRefs['pause'];
    stopVideo: PlaybackContextVideoRefs['stop'];
    checkIfVideoIsPlaying: PlaybackContextVideoRefs['isPlaying'];
    videoResumeTryNumberRef: PlaybackContextVideoRefs['resumeTryNumberRef'];
    currentVideoPlayerRef: PlaybackContextVideoRefs['ref'];
};

export type {StatusCallback, PlaybackContextValues, OriginalParent, UnloadVideo, StopVideo, PlaybackContextVideoRefs, PlaybackContext};

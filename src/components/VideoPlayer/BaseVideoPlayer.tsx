import {useEvent, useEventListener} from 'expo';
import {useVideoPlayer, VideoView} from 'expo-video';
import debounce from 'lodash/debounce';
import type {RefObject} from 'react';
import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {GestureResponderEvent} from 'react-native';
import {View} from 'react-native';
import {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import AttachmentOfflineIndicator from '@components/AttachmentOfflineIndicator';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import Hoverable from '@components/Hoverable';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import {useFullScreenContext} from '@components/VideoPlayerContexts/FullScreenContext';
import {usePlaybackContext} from '@components/VideoPlayerContexts/PlaybackContext';
import type {PlaybackSpeed} from '@components/VideoPlayerContexts/types';
import {useVideoPopoverMenuContext} from '@components/VideoPlayerContexts/VideoPopoverMenuContext';
import {useVolumeContext} from '@components/VideoPlayerContexts/VolumeContext';
import VideoPopoverMenu from '@components/VideoPopoverMenu';
import useNetwork from '@hooks/useNetwork';
import useThemeStyles from '@hooks/useThemeStyles';
import addEncryptedAuthTokenToURL from '@libs/addEncryptedAuthTokenToURL';
import {isMobileSafari} from '@libs/Browser';
import {canUseTouchScreen as canUseTouchScreenLib} from '@libs/DeviceCapabilities';
import CONST from '@src/CONST';
import shouldReplayVideo from './shouldReplayVideo';
import type {VideoPlayerProps} from './types';
import * as VideoUtils from './utils';
import VideoErrorIndicator from './VideoErrorIndicator';
import VideoPlayerControls from './VideoPlayerControls';

type ContentFit = 'contain' | 'cover' | 'fill';

function BaseVideoPlayer({
    url,
    resizeMode = 'contain',
    onVideoLoaded,
    isLooping = false,
    style,
    videoPlayerStyle,
    videoStyle,
    videoControlsStyle,
    videoDuration = 0,
    controlsStatus = CONST.VIDEO_PLAYER.CONTROLS_STATUS.SHOW,
    shouldUseSharedVideoElement = false,
    shouldUseSmallVideoControls = false,
    onPlaybackStatusUpdate,
    onFullscreenEnter,
    onFullscreenExit,
    shouldPlay,
    // TODO: investigate what is the root cause of the bug with unexpected video switching
    // isVideoHovered caused a bug with unexpected video switching. We are investigating the root cause of the issue,
    // but current workaround is just not to use it here for now. This causes not displaying the video controls when
    // user hovers the mouse over the carousel arrows, but this UI bug feels much less troublesome for now.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isVideoHovered = false,
    isPreview,
    reportID,
    onTap,
}: VideoPlayerProps & {reportID: string}) {
    const styles = useThemeStyles();
    const {
        pauseVideo,
        playVideo,
        currentlyPlayingURL,
        sharedElement,
        originalParent,
        shareVideoPlayerElements,
        currentVideoPlayerRef,
        updateCurrentURLAndReportID,
        videoResumeTryNumberRef,
        setCurrentlyPlayingURL,
    } = usePlaybackContext();
    const {isFullScreenRef} = useFullScreenContext();
    const {isOffline} = useNetwork();
    // Duration and position are now in seconds (expo-video uses seconds)
    const [duration, setDuration] = useState(videoDuration);
    const [position, setPosition] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnded, setIsEnded] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
    // we add "#t=0.001" at the end of the URL to skip first millisecond of the video and always be able to show proper video preview when video is paused at the beginning
    const [sourceURL] = useState(() => VideoUtils.addSkipTimeTagToURL(url.includes('blob:') || url.includes('file:///') ? url : addEncryptedAuthTokenToURL(url), 0.001));
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [popoverAnchorPosition, setPopoverAnchorPosition] = useState({horizontal: 0, vertical: 0});
    const [controlStatusState, setControlStatusState] = useState(controlsStatus);
    const controlsOpacity = useSharedValue(1);
    const controlsAnimatedStyle = useAnimatedStyle(() => ({
        opacity: controlsOpacity.get(),
    }));

    const videoPlayerElementParentRef = useRef<View | HTMLDivElement | null>(null);
    const videoPlayerElementRef = useRef<View | HTMLDivElement | null>(null);
    const sharedVideoPlayerParentRef = useRef<View | HTMLDivElement | null>(null);
    const isReadyForDisplayRef = useRef(false);
    const canUseTouchScreen = canUseTouchScreenLib();
    const isCurrentlyURLSet = currentlyPlayingURL === url;
    const isUploading = CONST.ATTACHMENT_LOCAL_URL_PREFIX.some((prefix) => url.startsWith(prefix));
    const {updateVolume, lastNonZeroVolume} = useVolumeContext();
    const {videoPopoverMenuPlayerRef, currentPlaybackSpeed, setCurrentPlaybackSpeed, setSource: setPopoverMenuSource} = useVideoPopoverMenuContext();
    const shouldUseNewRate = !videoPopoverMenuPlayerRef.current || sourceURL !== currentlyPlayingURL;

    // Create video player using the hook
    const player = useVideoPlayer(sourceURL, (p) => {
        // eslint-disable-next-line no-param-reassign
        p.loop = isLooping;
        // eslint-disable-next-line no-param-reassign
        p.muted = true;
    });

    // Use event hooks for player status
    const {isPlaying: playerIsPlaying} = useEvent(player, 'playingChange', {isPlaying: player.playing});

    // Listen for play to end
    useEventListener(player, 'playToEnd', () => {
        if (isLooping) {
            return;
        }
        setIsEnded(true);
        setControlStatusState(CONST.VIDEO_PLAYER.CONTROLS_STATUS.SHOW);
        controlsOpacity.set(1);
    });

    // Listen for status changes
    useEventListener(player, 'statusChange', (event) => {
        const newStatus = event.status;
        setIsLoading(newStatus === 'loading');
        setIsBuffering(newStatus === 'loading');
        if (newStatus === 'error' && event.error) {
            if (!isOffline) {
                setHasError(true);
            }
        } else if (newStatus === 'readyToPlay') {
            if (hasError) {
                setHasError(false);
            }
            isReadyForDisplayRef.current = true;
            onVideoLoaded?.();
            if (!shouldUseNewRate) {
                // eslint-disable-next-line react-hooks/immutability
                player.playbackRate = currentPlaybackSpeed;
            }
            if (isCurrentlyURLSet && !isUploading) {
                playVideo();
            }
        }
    });

    // Sync duration from player
    useEffect(() => {
        const checkDuration = () => {
            const playerDuration = player.duration;
            if (playerDuration > 0 && playerDuration !== duration) {
                setDuration(playerDuration);
            }
        };
        // Check immediately and set up interval
        checkDuration();
        const interval = setInterval(checkDuration, 100);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- we use player.duration in the interval
    }, [player.duration, duration]);

    // Sync playing state
    useEffect(() => {
        setIsPlaying(playerIsPlaying);
        if (playerIsPlaying && isEnded) {
            setIsEnded(false);
        }
    }, [playerIsPlaying, isEnded]);

    // Sync current time
    useEffect(() => {
        const interval = setInterval(() => {
            const currentTime = player.currentTime;
            setPosition(currentTime);

            // Check for replay condition
            if (shouldReplayVideo(isPlaying, duration, currentTime) && !isEnded) {
                player.currentTime = 0;
                player.play();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [player, isPlaying, duration, isEnded]);

    const prevIsMuted = useSharedValue(true);
    const prevVolume = useSharedValue(0);

    // Handle volume sync in fullscreen
    useEffect(() => {
        if (prevIsMuted.get() && prevVolume.get() === 0 && !player.muted && player.volume === 0) {
            updateVolume(lastNonZeroVolume.get());
        }

        if (isFullScreenRef.current && prevVolume.get() !== 0 && player.volume === 0 && !player.muted) {
            // eslint-disable-next-line react-hooks/immutability
            player.muted = true;
        }
        prevIsMuted.set(player.muted);
        prevVolume.set(player.volume);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- we use specific player properties
    }, [player.muted, player.volume, prevIsMuted, prevVolume, updateVolume, lastNonZeroVolume, isFullScreenRef]);

    // Call onPlaybackStatusUpdate callback
    useEffect(() => {
        onPlaybackStatusUpdate?.({
            isPlaying,
            isLoaded: !isLoading,
            isBuffering,
            didJustFinish: isEnded,
            currentTime: position,
            duration,
        });
    }, [isPlaying, isLoading, isBuffering, isEnded, position, duration, onPlaybackStatusUpdate]);

    const togglePlayCurrentVideo = useCallback(() => {
        setIsEnded(false);
        videoResumeTryNumberRef.current = 0;
        if (!isCurrentlyURLSet) {
            updateCurrentURLAndReportID(url, reportID);
        } else if (isPlaying) {
            pauseVideo();
        } else {
            playVideo();
        }
    }, [isCurrentlyURLSet, isPlaying, pauseVideo, playVideo, reportID, updateCurrentURLAndReportID, url, videoResumeTryNumberRef]);

    const hideControl = useCallback(() => {
        if (isEnded) {
            return;
        }

        controlsOpacity.set(withTiming(0, {duration: 500}, () => scheduleOnRN(setControlStatusState, CONST.VIDEO_PLAYER.CONTROLS_STATUS.HIDE)));
    }, [controlsOpacity, isEnded]);
    const debouncedHideControl = useMemo(() => debounce(hideControl, 1500), [hideControl]);

    useEffect(() => {
        if (canUseTouchScreen) {
            return;
        }
        // If the device cannot use touch screen, always set the control status as 'show'.
        // Then if user hover over the video, controls is shown.
        setControlStatusState(CONST.VIDEO_PLAYER.CONTROLS_STATUS.SHOW);
    }, [canUseTouchScreen]);

    useEffect(() => {
        // We only auto hide the control if the device can use touch screen.
        if (!canUseTouchScreen) {
            return;
        }
        if (controlStatusState !== CONST.VIDEO_PLAYER.CONTROLS_STATUS.SHOW) {
            return;
        }
        if (!isPlaying || isPopoverVisible) {
            debouncedHideControl.cancel();
            return;
        }

        debouncedHideControl();
    }, [isPlaying, debouncedHideControl, controlStatusState, isPopoverVisible, canUseTouchScreen]);

    useEffect(() => {
        if (!onTap || !controlStatusState) {
            return;
        }
        const shouldShowArrows = controlStatusState === CONST.VIDEO_PLAYER.CONTROLS_STATUS.SHOW || controlStatusState === CONST.VIDEO_PLAYER.CONTROLS_STATUS.VOLUME_ONLY;
        onTap(shouldShowArrows);
    }, [controlStatusState, onTap]);

    const stopWheelPropagation = useCallback((ev: WheelEvent) => ev.stopPropagation(), []);

    const toggleControl = useCallback(() => {
        if (controlStatusState === CONST.VIDEO_PLAYER.CONTROLS_STATUS.SHOW) {
            hideControl();
            return;
        }
        setControlStatusState(CONST.VIDEO_PLAYER.CONTROLS_STATUS.SHOW);
        controlsOpacity.set(1);
    }, [controlStatusState, controlsOpacity, hideControl]);

    const showPopoverMenu = (event?: GestureResponderEvent | KeyboardEvent) => {
        videoPopoverMenuPlayerRef.current = player;
        if (shouldUseNewRate) {
            setCurrentPlaybackSpeed(player.playbackRate as PlaybackSpeed);
        }
        setIsPopoverVisible(true);
        setPopoverMenuSource(url);
        if (!event || !('nativeEvent' in event)) {
            return;
        }
        setPopoverAnchorPosition({horizontal: event.nativeEvent.pageX, vertical: event.nativeEvent.pageY});
    };

    const hidePopoverMenu = () => {
        setIsPopoverVisible(false);
    };

    // Handle fullscreen events
    const handleFullscreenEnter = useCallback(() => {
        isFullScreenRef.current = true;
        onFullscreenEnter?.();
        // When the video is in fullscreen, we don't want the scroll to be captured by the InvertedFlatList of report screen.
        if (videoPlayerElementParentRef.current && 'addEventListener' in videoPlayerElementParentRef.current) {
            videoPlayerElementParentRef.current.addEventListener('wheel', stopWheelPropagation);
        }
    }, [isFullScreenRef, onFullscreenEnter, stopWheelPropagation]);

    const handleFullscreenExit = useCallback(() => {
        if (videoPlayerElementParentRef.current && 'removeEventListener' in videoPlayerElementParentRef.current) {
            videoPlayerElementParentRef.current.removeEventListener('wheel', stopWheelPropagation);
        }
        isFullScreenRef.current = false;

        // Sync volume updates in full screen mode after leaving it
        updateVolume(player.muted ? 0 : player.volume);

        // Resume playback after exiting fullscreen if video was playing
        if (isPlaying) {
            pauseVideo();
            playVideo();
            videoResumeTryNumberRef.current = 3;
        }

        onFullscreenExit?.();
    }, [isFullScreenRef, onFullscreenExit, pauseVideo, playVideo, videoResumeTryNumberRef, updateVolume, player.muted, player.volume, stopWheelPropagation, isPlaying]);

    // use `useLayoutEffect` instead of `useEffect` because ref is null when unmount in `useEffect` hook
    // ref url: https://reactjs.org/blog/2020/08/10/react-v17-rc.html#effect-cleanup-timing
    useLayoutEffect(
        () => () => {
            if (shouldUseSharedVideoElement || player !== currentVideoPlayerRef.current) {
                return;
            }
            player.pause();
            player.currentTime = 0;
            currentVideoPlayerRef.current = null;
        },
        [currentVideoPlayerRef, shouldUseSharedVideoElement, player],
    );

    useEffect(() => {
        if (!isUploading) {
            return;
        }

        // If we are uploading a new video, we want to pause previous playing video and immediately set the video player ref.
        if (currentVideoPlayerRef.current) {
            pauseVideo();
        }

        currentVideoPlayerRef.current = player;
    }, [url, currentVideoPlayerRef, isUploading, pauseVideo, player]);

    const isCurrentlyURLSetRef = useRef<boolean | undefined>(undefined);
    isCurrentlyURLSetRef.current = isCurrentlyURLSet;

    useEffect(
        () => () => {
            if (shouldUseSharedVideoElement || !isCurrentlyURLSetRef.current) {
                return;
            }

            setCurrentlyPlayingURL(null);
        },
        [setCurrentlyPlayingURL, shouldUseSharedVideoElement],
    );

    // update shared video elements
    useEffect(() => {
        // On mobile safari, we need to auto-play when sharing video element here
        shareVideoPlayerElements(
            player,
            videoPlayerElementParentRef.current,
            videoPlayerElementRef.current,
            isUploading || isFullScreenRef.current || (!isReadyForDisplayRef.current && !isMobileSafari()),
            {shouldUseSharedVideoElement, url, reportID},
        );
    }, [currentlyPlayingURL, shouldUseSharedVideoElement, shareVideoPlayerElements, url, isUploading, isFullScreenRef, reportID, player]);

    // append shared video element to new parent (used for example in attachment modal)
    useEffect(() => {
        if (url !== currentlyPlayingURL || !sharedElement || isFullScreenRef.current) {
            return;
        }

        const newParentRef = sharedVideoPlayerParentRef.current;

        if (!shouldUseSharedVideoElement) {
            if (newParentRef && 'childNodes' in newParentRef && newParentRef.childNodes[0]) {
                newParentRef.childNodes[0]?.remove();
            }
            return;
        }

        if (currentlyPlayingURL === url && newParentRef && 'appendChild' in newParentRef) {
            newParentRef.appendChild(sharedElement as HTMLDivElement);
        }
        return () => {
            if (!originalParent || !('appendChild' in originalParent)) {
                return;
            }
            originalParent.appendChild(sharedElement as HTMLDivElement);

            if (!newParentRef || !('childNodes' in newParentRef)) {
                return;
            }
            newParentRef.childNodes[0]?.remove();
        };
    }, [currentVideoPlayerRef, currentlyPlayingURL, isFullScreenRef, originalParent, reportID, sharedElement, shouldUseSharedVideoElement, url]);

    useEffect(() => {
        if (!shouldPlay) {
            return;
        }
        updateCurrentURLAndReportID(url, reportID);
    }, [reportID, shouldPlay, updateCurrentURLAndReportID, url]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/immutability
        player.muted = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- we want to set muted only once when player changes
    }, [player.muted]);

    // Convert duration and position from seconds to milliseconds for the controls
    const durationMs = duration * 1000;
    const positionMs = position * 1000;

    return (
        <>
            {/* We need to wrap the video component in a component that will catch unhandled pointer events. Otherwise, these
            events will bubble up the tree, and it will cause unexpected press behavior. */}
            <PressableWithoutFeedback
                accessible={false}
                style={[styles.cursorDefault, style]}
            >
                <Hoverable shouldFreezeCapture={isPopoverVisible}>
                    {(isHovered) => (
                        <View style={[styles.w100, styles.h100]}>
                            <PressableWithoutFeedback
                                accessibilityRole="button"
                                accessible={false}
                                onPress={() => {
                                    if (isFullScreenRef.current) {
                                        return;
                                    }
                                    if (!canUseTouchScreen) {
                                        togglePlayCurrentVideo();
                                        return;
                                    }
                                    toggleControl();
                                }}
                                style={[styles.flex1, styles.noSelect]}
                                sentryLabel={CONST.SENTRY_LABEL.VIDEO_PLAYER.VIDEO}
                            >
                                {shouldUseSharedVideoElement ? (
                                    <>
                                        <View
                                            ref={sharedVideoPlayerParentRef as RefObject<View | null>}
                                            style={[styles.flex1]}
                                        />
                                        {/* We are adding transparent absolute View between appended video component and control buttons to enable
                                    catching onMouse events from Attachment Carousel. Due to late appending React doesn't handle
                                    element's events properly. */}
                                        <View style={[styles.w100, styles.h100, styles.pAbsolute]} />
                                    </>
                                ) : (
                                    <View
                                        fsClass={CONST.FULLSTORY.CLASS.EXCLUDE}
                                        style={styles.flex1}
                                        ref={(el) => {
                                            if (!el) {
                                                return;
                                            }
                                            const elHTML = el as View | HTMLDivElement;
                                            if ('childNodes' in elHTML && elHTML.childNodes[0]) {
                                                videoPlayerElementRef.current = elHTML.childNodes[0] as HTMLDivElement;
                                            }
                                            videoPlayerElementParentRef.current = el;
                                        }}
                                    >
                                        <VideoView
                                            player={player}
                                            style={[styles.w100, styles.h100, videoPlayerStyle, videoStyle]}
                                            contentFit={(resizeMode as ContentFit) ?? 'contain'}
                                            nativeControls={false}
                                            allowsFullscreen
                                            onFullscreenEnter={handleFullscreenEnter}
                                            onFullscreenExit={handleFullscreenExit}
                                            testID={CONST.VIDEO_PLAYER_TEST_ID}
                                        />
                                    </View>
                                )}
                            </PressableWithoutFeedback>
                            {hasError && !isBuffering && !isOffline && <VideoErrorIndicator isPreview={isPreview} />}
                            {((isLoading && !isOffline && !hasError) || (isBuffering && !isPlaying && !hasError)) && (
                                <FullScreenLoadingIndicator style={[styles.opacity1, styles.bgTransparent]} />
                            )}
                            {isLoading && (isOffline || !isBuffering) && <AttachmentOfflineIndicator isPreview={isPreview} />}
                            {controlStatusState !== CONST.VIDEO_PLAYER.CONTROLS_STATUS.HIDE && !isLoading && (isPopoverVisible || isHovered || canUseTouchScreen || isEnded) && (
                                <VideoPlayerControls
                                    duration={durationMs}
                                    position={positionMs}
                                    url={url}
                                    videoPlayerRef={player}
                                    isPlaying={isPlaying}
                                    small={shouldUseSmallVideoControls}
                                    style={[videoControlsStyle, controlsAnimatedStyle]}
                                    togglePlayCurrentVideo={togglePlayCurrentVideo}
                                    controlsStatus={controlStatusState}
                                    showPopoverMenu={showPopoverMenu}
                                    reportID={reportID}
                                />
                            )}
                        </View>
                    )}
                </Hoverable>
            </PressableWithoutFeedback>
            <VideoPopoverMenu
                isPopoverVisible={isPopoverVisible}
                hidePopover={hidePopoverMenu}
                anchorPosition={popoverAnchorPosition}
            />
        </>
    );
}

export default BaseVideoPlayer;

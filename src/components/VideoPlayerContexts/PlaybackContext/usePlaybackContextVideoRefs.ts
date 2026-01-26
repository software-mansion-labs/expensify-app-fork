import type {VideoPlayer} from 'expo-video';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import Visibility from '@libs/Visibility';
import type {PlaybackContextVideoRefs, StopVideo} from './types';

function usePlaybackContextVideoRefs(resetCallback: () => void) {
    const currentVideoPlayerRef: PlaybackContextVideoRefs['ref'] = useRef(null);
    const videoResumeTryNumberRef: PlaybackContextVideoRefs['resumeTryNumberRef'] = useRef(0);
    const isPlayPendingRef = useRef(false);

    const pauseVideo: PlaybackContextVideoRefs['pause'] = useCallback(() => {
        currentVideoPlayerRef.current?.pause();
    }, [currentVideoPlayerRef]);

    const stopVideo: StopVideo = useCallback(() => {
        const player = currentVideoPlayerRef.current;
        if (!player) {
            return;
        }
        player.pause();
        player.currentTime = 0;
    }, [currentVideoPlayerRef]);

    const playVideo: PlaybackContextVideoRefs['play'] = useCallback(() => {
        if (!Visibility.isVisible()) {
            isPlayPendingRef.current = true;
            return;
        }
        const player = currentVideoPlayerRef.current;
        if (!player) {
            return;
        }
        // If video is at the end, reset position before playing
        if (player.duration > 0 && player.currentTime >= player.duration) {
            player.currentTime = 0;
        }
        player.play();
    }, [currentVideoPlayerRef]);

    const checkIfVideoIsPlaying: PlaybackContextVideoRefs['isPlaying'] = useCallback(
        (statusCallback) => {
            const player = currentVideoPlayerRef.current;
            statusCallback(player?.playing ?? false);
        },
        [currentVideoPlayerRef],
    );

    const resetVideoPlayerData: PlaybackContextVideoRefs['resetPlayerData'] = useCallback(() => {
        stopVideo();
        videoResumeTryNumberRef.current = 0;
        resetCallback();
        currentVideoPlayerRef.current = null;
    }, [resetCallback, stopVideo]);

    useEffect(() => {
        return Visibility.onVisibilityChange(() => {
            if (!Visibility.isVisible() || !isPlayPendingRef.current) {
                return;
            }
            playVideo();
            isPlayPendingRef.current = false;
        });
    }, [playVideo]);

    const updateCurrentVideoPlayerRef: PlaybackContextVideoRefs['updateRef'] = (player: VideoPlayer | null) => {
        currentVideoPlayerRef.current = player;
    };

    return useMemo(
        (): PlaybackContextVideoRefs => ({
            resetPlayerData: resetVideoPlayerData,
            isPlaying: checkIfVideoIsPlaying,
            pause: pauseVideo,
            stop: stopVideo,
            play: playVideo,
            ref: currentVideoPlayerRef,
            resumeTryNumberRef: videoResumeTryNumberRef,
            updateRef: updateCurrentVideoPlayerRef,
        }),
        [checkIfVideoIsPlaying, pauseVideo, playVideo, resetVideoPlayerData, stopVideo],
    );
}

export default usePlaybackContextVideoRefs;

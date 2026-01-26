/**
 * Whether to replay the video when users press play button
 * Duration and position are in seconds (expo-video uses seconds)
 */
export default function shouldReplayVideo(isPlaying: boolean, duration: number, position: number): boolean {
    if (!isPlaying && duration > 0 && position >= duration) {
        return true;
    }
    return false;
}

/**
 * Whether to replay the video when users press play button
 * Duration and position are in seconds (expo-video uses seconds)
 */
export default function shouldReplayVideo(isPlaying: boolean, duration: number, position: number): boolean {
    // When we upload an attachment on Android, we should return false if the duration is 0
    // to prevent auto-playing video when the video is uploading
    if (!isPlaying && duration === position && duration !== 0) {
        return true;
    }
    return false;
}

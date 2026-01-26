/**
 * Whether to replay the video when users press play button
 * Duration and position are in seconds (expo-video uses seconds)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function shouldReplayVideo(isPlaying: boolean, duration: number, position: number): boolean {
    return false;
}

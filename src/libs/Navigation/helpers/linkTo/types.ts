type ActionPayloadParams = {
    screen?: string;
    params?: unknown;
    path?: string;
};

type ActionPayload = {
    params?: ActionPayloadParams;
};

type LinkToOptions = {
    // To explicitly set the action type to replace.
    forceReplace?: boolean;
    // Callback to execute after the navigation transition animation completes.
    afterTransition?: () => void;
};

export type {ActionPayload, LinkToOptions};

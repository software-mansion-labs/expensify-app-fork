type LocationPermissionModalProps = {
    /** A callback to call when the permission has been granted */
    onGrant: () => void;

    /** A callback to call when the permission has been denied */
    onDeny: (wasUserInitiated: boolean) => void;

    startPermissionFlow: boolean;

    resetPermissionFlow: () => void;

    /** A callback to call when the initial get location is completed */
    onInitialGetLocationCompleted?: () => void;
};

export default LocationPermissionModalProps;

#!/bin/bash

# Default to iOS if not provided
platform="ios"

# Parse the platform argument
if [ "$#" -gt 0 ]; then
    case "$1" in
        --ios)
            platform="ios"
            ;;
        --android)
            platform="android"
            ;;
        *)
            echo "Invalid argument. Please use --ios or --android."
            exit 1
            ;;
    esac
fi

# Get the fingerprint using rock (suppress stderr, get last line of stdout)
fingerprint=$(npx rock fingerprint --platform "$platform" 2>/dev/null | tail -1)

# Echo the fingerprint to console
echo "$fingerprint"

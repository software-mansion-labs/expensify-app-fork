#!/bin/bash
#
# Collects the native debug symbols of the Hermes VM (libhermesvm.so) for a given hermes-android version.
#
# Meta ships two copies of libhermesvm.so in com.facebook.hermes:hermes-android-<version>-<variant>.aar:
#   - jni/<abi>/libhermesvm.so                                      stripped, this is what ends up in the APK
#   - prefab/modules/hermesvm/libs/android.<abi>/libhermesvm.so   unstripped (full DWARF), used by the NDK linker
# Both are the same build (same GNU build-id), so the prefab copy symbolicates crashes of the runtime copy.
#
# Like the react-android symbols (patch 049), the output is a debug companion per library
# (`llvm-objcopy --only-keep-debug`, the format AGP uses for native-debug-symbols.zip): symbols only, no code.
# The NDK is looked up through LLVM_OBJCOPY, ANDROID_NDK_HOME, ANDROID_NDK_ROOT, then the newest
# $ANDROID_HOME/ndk/<version>. Without one the unstripped library is copied as is, which Sentry accepts too.
#
# Usage: extract-hermes-debug-symbols.sh <hermes-android version> <output dir> [variant...]
# Output layout: <output dir>/<variant>/lib/<abi>/libhermesvm.so.dbg (the native-debug-symbols.zip layout).
set -euo pipefail

VERSION="${1:?hermes-android version is required (e.g. 250829098.0.14)}"
OUT_DIR="${2:?output directory is required}"
shift 2
VARIANTS=("$@")
if [[ ${#VARIANTS[@]} -eq 0 ]]; then
    VARIANTS=(release debug)
fi

case "$(uname -s)" in
    Darwin) HOST_TAG=darwin-x86_64 ;;
    Linux) HOST_TAG=linux-x86_64 ;;
    *) HOST_TAG=windows-x86_64 ;;
esac

find_objcopy() {
    if [[ -n "${LLVM_OBJCOPY:-}" && -x "${LLVM_OBJCOPY}" ]]; then
        echo "${LLVM_OBJCOPY}"
        return
    fi
    local ndk
    for ndk in "${ANDROID_NDK_HOME:-}" "${ANDROID_NDK_ROOT:-}"; do
        if [[ -n "$ndk" && -x "${ndk}/toolchains/llvm/prebuilt/${HOST_TAG}/bin/llvm-objcopy" ]]; then
            echo "${ndk}/toolchains/llvm/prebuilt/${HOST_TAG}/bin/llvm-objcopy"
            return
        fi
    done
    local sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
    if [[ -n "$sdk" && -d "${sdk}/ndk" ]]; then
        # shellcheck disable=SC2012
        for ndk in $(ls -d "${sdk}"/ndk/* 2>/dev/null | sort -V -r); do
            if [[ -x "${ndk}/toolchains/llvm/prebuilt/${HOST_TAG}/bin/llvm-objcopy" ]]; then
                echo "${ndk}/toolchains/llvm/prebuilt/${HOST_TAG}/bin/llvm-objcopy"
                return
            fi
        done
    fi
}

OBJCOPY="$(find_objcopy || true)"
if [[ -n "$OBJCOPY" ]]; then
    echo "Using ${OBJCOPY} to produce debug companions"
else
    echo "::warning::llvm-objcopy not found, keeping the unstripped libraries instead of debug companions"
fi

MAVEN_BASE="https://repo1.maven.org/maven2/com/facebook/hermes/hermes-android/${VERSION}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

for VARIANT in "${VARIANTS[@]}"; do
    AAR="hermes-android-${VERSION}-${VARIANT}.aar"
    echo "Downloading ${MAVEN_BASE}/${AAR}"
    curl -sSfL --retry 3 -o "${TMP_DIR}/${AAR}" "${MAVEN_BASE}/${AAR}"

    EXTRACT_DIR="${TMP_DIR}/${VARIANT}"
    mkdir -p "$EXTRACT_DIR"
    unzip -q -o "${TMP_DIR}/${AAR}" 'prefab/modules/hermesvm/libs/android.*/libhermesvm.so' -d "$EXTRACT_DIR"

    for LIB in "$EXTRACT_DIR"/prefab/modules/hermesvm/libs/android.*/libhermesvm.so; do
        ABI_DIR="$(basename "$(dirname "$LIB")")"
        ABI="${ABI_DIR#android.}"
        DEST="${OUT_DIR}/${VARIANT}/lib/${ABI}"
        mkdir -p "$DEST"
        if [[ -n "$OBJCOPY" ]]; then
            "$OBJCOPY" --only-keep-debug "$LIB" "${DEST}/libhermesvm.so.dbg"
            echo "  ${VARIANT}/${ABI}: $(du -h "${DEST}/libhermesvm.so.dbg" | cut -f1) (companion)"
        else
            cp "$LIB" "${DEST}/libhermesvm.so"
            echo "  ${VARIANT}/${ABI}: $(du -h "${DEST}/libhermesvm.so" | cut -f1) (unstripped)"
        fi
    done
done

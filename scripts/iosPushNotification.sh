#!/bin/bash

TOP="$(realpath "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)/..")"
readonly TOP

TYPES_FILE="${TOP}/src/libs/Notification/PushNotification/NotificationType.ts"
BUNDLE_HYBRID="com.expensify.expensifylite"
BUNDLE_STANDALONE="com.expensify.chat.dev"

BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

# Parses @push-payload annotations from NotificationType.ts.
# Each line pairs with the next line's type value, producing: <typeValue> <field1:type1> <field2:type2> ...
get_types_with_fields() {
    grep -A1 '@push-payload' "$TYPES_FILE" | grep -v '^--$' | paste - - | while IFS=$'\t' read -r annotation type_line; do
        fields=$(echo "$annotation" | sed 's/.*@push-payload //')
        value=$(echo "$type_line" | grep -o "'[a-zA-Z]*'" | tr -d "'")
        if [ -n "$value" ]; then
            echo "$value $fields"
        fi
    done
}

get_valid_types() {
    get_types_with_fields | awk '{print $1}'
}

get_base_fields() {
    grep '@push-base' "$TYPES_FILE" | sed 's/.*@push-base //' | sed 's/[[:space:]]*$//'
}

# Converts a raw value string to its JSON representation:
#   integers -> number, true/false -> boolean, {}/[] -> raw JSON, else -> quoted string
json_value() {
    local val="$1"
    if [[ "$val" =~ ^[0-9]+$ ]]; then
        printf '%s' "$val"
    elif [[ "$val" == "true" || "$val" == "false" ]]; then
        printf '%s' "$val"
    elif [[ "$val" == \{* || "$val" == \[* ]]; then
        printf '%s' "$val"
    else
        printf '"%s"' "$val"
    fi
}

usage() {
    printf "${BOLD}Usage:${RESET} ios-push-notification ${DIM}[-s] [-f <file>]${RESET} ${CYAN}<type>${RESET} ${GREEN}<title>${RESET} ${DIM}[key=value ...]${RESET}\n"
    printf "       ios-push-notification ${YELLOW}list${RESET}\n"
    echo ""
    printf "${BOLD}Options:${RESET}\n"
    printf "  ${YELLOW}-s${RESET}          Use standalone bundle ID ${DIM}(%s)${RESET}\n" "$BUNDLE_STANDALONE"
    printf "              Default bundle ID is ${DIM}%s${RESET}\n" "$BUNDLE_HYBRID"
    printf "  ${YELLOW}-f${RESET} <file>   Read additional payload fields from a JSON file\n"
    echo ""
}

bundle_id="$BUNDLE_HYBRID"
payload_file=""
while getopts ":sf:" opt; do
    case $opt in
        s) bundle_id="$BUNDLE_STANDALONE" ;;
        f) payload_file="$OPTARG" ;;
        \?)
            printf "${RED}Invalid option:${RESET} -%s\n" "$OPTARG" >&2
            exit 1
            ;;
        :)
            printf "${RED}Option -%s requires an argument${RESET}\n" "$OPTARG" >&2
            exit 1
            ;;
    esac
done
shift $((OPTIND - 1))

if [ "$1" == "list" ]; then
    printf "${BOLD}Available notification types${RESET} ${DIM}(from NotificationType.ts)${RESET}\n"
    echo ""
    get_types_with_fields | while IFS= read -r line; do
        type_name=$(echo "$line" | awk '{print $1}')
        fields=$(echo "$line" | cut -d' ' -f2-)
        printf "  ${CYAN}${BOLD}%s${RESET}\n" "$type_name"
        for field in $fields; do
            name="${field%%:*}"
            ftype="${field#*:}"
            printf "    ${GREEN}%s${RESET}${DIM}:%s${RESET}\n" "$name" "$ftype"
        done
    done
    echo ""
    base_fields=$(get_base_fields)
    if [ -n "$base_fields" ]; then
        printf "${BOLD}Common fields${RESET} ${DIM}(can be passed to any type)${RESET}\n"
        for field in $base_fields; do
            name="${field%%:*}"
            ftype="${field#*:}"
            printf "    ${YELLOW}%s${RESET}${DIM}:%s${RESET}\n" "$name" "$ftype"
        done
        echo ""
    fi
    exit 0
fi

if [ "$#" -lt 2 ]; then
    usage
    exit 1
fi

type="$1"
title="$2"
shift 2

valid_types=$(get_valid_types)
if ! echo "$valid_types" | grep -qx "$type"; then
    printf "${RED}Unknown type:${RESET} %s\n" "$type"
    echo ""
    printf "${BOLD}Valid types:${RESET}\n"
    for t in $valid_types; do
        printf "  ${CYAN}%s${RESET}\n" "$t"
    done
    echo ""
    exit 2
fi

payload_fields=""

if [ -n "$payload_file" ]; then
    if [ ! -f "$payload_file" ]; then
        printf "${RED}Payload file not found:${RESET} %s\n" "$payload_file"
        exit 3
    fi
    file_content=$(cat "$payload_file")
    # Strip the outer braces and leading/trailing whitespace to get inner key-value pairs
    file_inner=$(echo "$file_content" | sed 's/^[[:space:]]*{//' | sed 's/}[[:space:]]*$//' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
    if [ -n "$file_inner" ]; then
        payload_fields+=", $file_inner"
    fi
fi

for arg in "$@"; do
    key="${arg%%=*}"
    val="${arg#*=}"
    if [ "$key" = "$arg" ]; then
        printf "${RED}Invalid argument:${RESET} %s ${DIM}(expected key=value)${RESET}\n" "$arg"
        exit 3
    fi
    payload_fields+=", \"$key\": $(json_value "$val")"
done

json=$(cat <<EOF
{
  "aps": {
    "alert": "$title"
  },
  "payload": {
    "type": "$type",
    "app": "new"$payload_fields
  }
}
EOF
)

echo "$json" | xcrun simctl push booted "$bundle_id" -

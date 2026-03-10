#!/bin/bash

TOP="$(realpath "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)/..")"
readonly TOP
# Define the directory where .apns files are located
DIRECTORY="${TOP}/tests/ios-push-notifications"

# Function to extract unique placeholders from a file using grep and cut (compatible with macOS)
extract_placeholders() {
    grep -o '<[A-Z_]\+>' "$1" | cut -d'<' -f2 | cut -d'>' -f1 | sort -u
}

# Parse options
use_standalone=false
while getopts ":s" opt; do
  case $opt in
    s)
      use_standalone=true
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
  esac
done
shift $((OPTIND-1))

# Check the first argument for 'list' command
if [ "$1" == "list" ]; then
    echo "Available push notifications:"
    for file in "$DIRECTORY"/*.apns; do
        if [[ "$file" =~ \.standalone\.apns$ ]]; then
            base_name=$(basename "$file" .standalone.apns)
            if [[ ! -f "$DIRECTORY/$base_name.apns" ]]; then
                echo "$base_name (Standalone only)"
            fi
        else
            base_name=$(basename "$file" .apns)
            if [[ -f "$DIRECTORY/$base_name.standalone.apns" ]]; then
                echo "$base_name (+ Standalone)"
            else
                echo "$base_name"
            fi
        fi
    done
    echo ""
    exit 0
fi

# Check if the file name without extension is provided
if [ "$#" -lt 1 ]; then
    echo "Proper usage: ios-push-notification [-s] <name>"
    echo "Use 'list' to display available notifications."
    echo ""
    exit 1
fi

# Assign the file path by adding .apns or .standalone.apns extension
if [ "$use_standalone" == true ]; then
    input_file="${DIRECTORY}/$1.standalone.apns"
else
    input_file="${DIRECTORY}/$1.apns"
fi

# Verify that the file exists
if [ ! -f "$input_file" ]; then
    echo "$1 does not exist, use 'list' to display available notifications."
    echo "Proper usage: ios-push-notification [-s] <name>"
    echo ""
    exit 2
fi

# Extract placeholders
placeholders=$(extract_placeholders "$input_file")
if [ -z "$placeholders" ]; then
    cat "$input_file"
    exit 3
fi

# Check if correct number of replacements were provided
if [ $(($# - 1)) -lt "$(echo "$placeholders" | wc -l)" ]; then
    echo "Insufficient parameters provided."
    echo "Proper usage: ios-push-notification [-s] $1 $(echo "$placeholders" | sed 's/^/</' | sed 's/$/>/' | tr '\n' ' ')"
    echo ""
    exit 4
fi

# Remove the first argument (file name), leaving only the replacement values
shift

# Go through the file and replace each placeholder with the successive argument
sed_script=""
placeholder_index=1
for placeholder in $placeholders; do
    replacement="${!placeholder_index}"
    # Check if the placeholder is for a string and add quotes if necessary
    if [[ "$placeholder" == *_STRING ]]; then
        replacement="\"$replacement\""
    fi
    # Escape special characters for sed
    replacement_esc="$(printf '%s' "$replacement" | sed 's/[&/\]/\\&/g')"
    sed_script+="s|<$placeholder>|$replacement_esc|g;"
    ((placeholder_index++))
done

# Execute the sed command and print the result
sed "$sed_script" "$input_file" | xcrun simctl push booted -

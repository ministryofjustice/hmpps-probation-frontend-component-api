#!/bin/bash

# Force the script to run from its own directory
cd "$(dirname "$0")"

# Check if docker command is available in the PATH
if ! command -v docker &> /dev/null; then
    # Display a graphical macOS error dialog to the user
    osascript -e 'display dialog "Error: Docker is not installed or not running. Please install Docker Desktop and try again." buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

# start the stack
cd .. && docker compose up -d --build && echo -ne "\a Deploying the stack ..." && sleep 60

# Display the dialog using the custom checkmark icon
osascript -e 'display dialog "The API + CMS stack should be up and ready now!" buttons {"OK"} default button "OK" with icon note'
#osascript -e 'display notification "Docker environment is ready." with title "Success" sound name "Glass"'

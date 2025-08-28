# Slack Thread Mover Bot

A Slack bot to move or delete entire threads from one channel to another, preserving the original authors' names and avatars.

## Features

- **Move Threads**: Copy an entire thread from one public or private channel to another.
- **Delete Threads**: Delete an entire thread from a channel.
- **Preserve Authorship**: When moving a thread, messages are posted with the original author's name and profile picture.
- **Avoid Notification Spam**: User and channel mentions are de-linked in the copied thread to prevent re-notifying users.
- **Easy to Use**: A simple message shortcut opens a modal to select the action and destination channel.
- **Permission Tester**: Includes a `/test-permissions` slash command to diagnose setup issues.

## How it Works

The bot is triggered by a message shortcut ("Copy Thread"). It then opens a modal asking the user if they want to:

1.  **Move the thread**: Copies all messages to a new channel and then deletes the original thread.
2.  **Delete the thread**: Deletes all messages in the original thread without copying them.

To perform these actions, the bot uses two types of Slack tokens:

- A **Bot Token** for most actions like reading messages, posting messages, and getting user information.
- A **User Token** for deleting messages, which requires higher privileges.

## Prerequisites

- Node.js (v14 or later recommended)
- A Slack workspace where you have permission to install and manage apps.
- `ngrok` or another tunneling service for local development to expose your local server to Slack's API.

## Setup and Installation

### 1. Create a Slack App

1.  Go to the [Slack API website](https://api.slack.com/apps) and click "Create New App".
2.  Choose "From scratch", give your app a name (e.g., "Thread Mover"), and select your workspace.

### 2. Configure Permissions (Scopes)

Navigate to the "OAuth & Permissions" page in your app's settings. You need to add scopes for both the bot and the user.

**Bot Token Scopes:**

Add the following scopes under "Bot Token Scopes":

- `commands`: To add slash commands and shortcuts.
- `chat:write`: To post messages as the bot.
- `conversations:history`: To read messages in channels where the bot is a member.
- `users:read`: To access user profiles for names and avatars.
- `conversations:read`: To get channel information.
- `conversations:members`: To check channel membership.

**User Token Scopes:**

Add the following scopes under "User Token Scopes":

- `chat:write`: To delete messages. **Important**: The user who authorizes this token must have permission to delete messages in the channels where the bot will be used. This usually means they are a Workspace Admin/Owner.

After adding scopes, you'll need to (re)install the app to your workspace.

### 3. Get Your Tokens and Secrets

1.  **Bot Token**: On the "OAuth & Permissions" page, you'll find the "Bot User OAuth Token" (starts with `xoxb-`).
2.  **User Token**: You also need to install the app as a user to get a "User OAuth Token" (starts with `xoxp-`). Make sure you are installing it as a user with admin/owner privileges.
3.  **Signing Secret**: On the "Basic Information" page, find your "Signing Secret" under "App Credentials".

### 4. Configure Message Shortcut

1.  Go to the "Interactivity & Shortcuts" page.
2.  Make sure "Interactivity" is turned **ON**.
3.  Under "Shortcuts", click "Create New Shortcut".
4.  Select "On a message".
5.  Fill in the details:
    - **Name**: `Copy Thread`
    - **Short description**: `Move or delete a thread.`
    - **Callback ID**: `copy_thread_shortcut`
6.  Click "Create".

### 5. Configure Slash Command

1.  Go to the "Slash Commands" page.
2.  Click "Create New Command".
3.  Fill in the details:
    - **Command**: `/test-permissions`
    - **Short Description**: `Check if the bot has the right permissions.`
    - **Usage Hint**: `Run in a channel to test.`
4.  Click "Save".

### 6. Set up Request URLs

When you run the bot (either locally with `ngrok` or on a server), you'll have a public URL. Slack needs this URL to send events.

- **Interactivity & Shortcuts Request URL**: Set this to `https://your-public-url.com/slack/events`.
- **Slash Commands Request URL**: Set this to `https://your-public-url.com/slack/events`.

### 7. Local Project Setup

1.  Clone this repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root of the project and add your credentials:
    ```
    SLACK_BOT_TOKEN=xoxb-...
    SLACK_USER_TOKEN=xoxp-...
    SLACK_SIGNING_SECRET=...
    ```

## Running the Bot

### Locally

1.  Start the app:

    ```bash
    node index.js
    ```

    The bot will be running on port 3000 by default.

2.  Expose your local server to the internet using `ngrok`:

    ```bash
    ngrok http 3000
    ```

3.  Use the `https` URL provided by `ngrok` as the base for your Request URLs in the Slack App configuration (e.g., `https://xxxx-xx-xxx-xx-xx.ngrok.io/slack/events`).

### Deployment (AWS Lambda)

This project is configured for serverless deployment to AWS Lambda using the Serverless Framework.

1.  Install the Serverless CLI: `npm install -g serverless`
2.  Configure your AWS credentials.
3.  Deploy the function:
    ```bash
    serverless deploy
    ```
4.  The output will give you an API Gateway URL. Use this URL for your Slack App's Request URLs.
5.  You will also need to configure the environment variables (`SLACK_BOT_TOKEN`, `SLACK_USER_TOKEN`, `SLACK_SIGNING_SECRET`) in your `serverless.yml` file or directly in the Lambda function's configuration in the AWS Console.

## Usage

1.  **Invite the Bot**: Invite the bot to any channel you want to manage threads in.
2.  **Move a Thread**:
    - Hover over any message in a thread.
    - Click the "More actions" (three dots) button.
    - Select "Copy Thread".
    - In the modal that appears, select "Move thread to another channel".
    - Choose a destination channel.
    - Click "Execute".
3.  **Delete a Thread**:
    - Follow the same steps as above.
    - In the modal, select "Just delete thread (no copy)".
    - Click "Execute".
4.  **Test Permissions**:
    - In any channel the bot is in, type `/test-permissions`.
    - The bot will reply with a summary of its current permissions and token status.

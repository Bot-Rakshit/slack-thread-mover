import pkg from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';

const { App, LogLevel } = pkg;

dotenv.config();

// Initializes your app with your bot token and signing secret
const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	logLevel: LogLevel.DEBUG,
});

// Create a separate client using the user token for operations that require user permissions (like deleting messages)
const userClient = new WebClient(process.env.SLACK_USER_TOKEN);

export { app, userClient };

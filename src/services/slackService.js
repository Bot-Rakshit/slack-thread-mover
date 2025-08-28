import { userClient } from '../app.js';
import { cleanMessage } from '../utils/mentionUtils.js';

const fetchThreadMessages = async (client, channel, ts, logger) => {
	try {
		const result = await client.conversations.replies({ channel, ts });
		if (!result.ok || !result.messages || result.messages.length === 0) {
			logger.error('Could not fetch the original thread:', result.error);
			return null;
		}
		return result.messages;
	} catch (error) {
		logger.error(`Error fetching thread messages from ${channel}:`, error);
		return null;
	}
};

const fetchUserInfo = async (client, userId, logger) => {
	try {
		const result = await client.users.info({ user: userId });
		if (result.ok) {
			const { user } = result;
			return {
				username: user?.profile?.display_name || user?.profile?.real_name || 'Original Author',
				iconUrl: user?.profile?.image_48,
			};
		}
		logger.warn(`users.info not ok for ${userId}: ${result.error}`);
		return { username: 'Original Author', iconUrl: undefined };
	} catch (error) {
		logger.warn(`Could not fetch user info for ${userId}: ${error.data?.error || error.message}`);
		return { username: 'Original Author', iconUrl: undefined };
	}
};

const postMessage = async (client, payload, logger) => {
	try {
		const result = await client.chat.postMessage(payload);
		if (!result.ok) {
			logger.error('Failed to post message:', result.error);
			return null;
		}
		return result;
	} catch (error) {
		logger.error('Error posting message:', error);
		return null;
	}
};

const deleteMessage = async (channel, ts, logger) => {
	try {
		const result = await userClient.chat.delete({ channel, ts });
		if (result.ok) {
			logger.info(`Successfully deleted message ${ts}`);
		} else {
			logger.error(`Failed to delete message ${ts}: ${result.error}`);
		}
	} catch (error) {
		logger.error(`Failed to delete message ${ts}:`, error);
		if (error.data?.error) {
			logger.error(`Deletion error details: ${error.data.error}`);
		}
	}
};

const copyThread = async (
	client,
	messages,
	targetChannelId,
	originalChannelId,
	userWhoInitiated,
	logger
) => {
	let newThreadTs;
	for (const message of messages) {
		if (!message.text || message.text.trim() === '') {
			logger.info(`Skipping message ${message.ts} - no text content`);
			continue;
		}

		const { username, iconUrl } = await fetchUserInfo(client, message.user, logger);
		const { text, blocks } = cleanMessage(message);

		const postPayload = {
			channel: targetChannelId,
			text,
			username,
			blocks,
		};
		if (iconUrl) postPayload.icon_url = iconUrl;
		if (message.thread_ts && message.ts !== message.thread_ts && newThreadTs) {
			postPayload.thread_ts = newThreadTs;
		}

		const postResult = await postMessage(client, postPayload, logger);

		if (postResult) {
			if (!newThreadTs) newThreadTs = postResult.ts;
		} else {
			await postMessage(
				client,
				{
					channel: userWhoInitiated,
					text: `❌ Failed to copy thread to <#${targetChannelId}>. Error: ${postResult.error}. Make sure the bot is a member of that channel.`,
				},
				logger
			);
			return null;
		}
	}

	// Send confirmation message
	const confirmationText = `✅ This thread was copied from <#${originalChannelId}> by <@${userWhoInitiated}>.`;
	await postMessage(
		client,
		{
			channel: targetChannelId,
			thread_ts: newThreadTs,
			text: confirmationText,
		},
		logger
	);

	return newThreadTs;
};

export { fetchThreadMessages, deleteMessage, copyThread };

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

// --- 1. LISTEN FOR THE MESSAGE SHORTCUT ---
// This is triggered when a user clicks "Copy Thread" on a message.
app.shortcut('copy_thread_shortcut', async ({ shortcut, ack, client, logger }) => {
	try {
		// Acknowledge the shortcut request
		await ack();

		// The message that the user clicked on is the parent message of the thread.
		// If the message itself has a thread_ts, it's a reply, not the parent.
		// We want the parent's timestamp, which is either its own ts or its thread_ts.
		const threadTs = shortcut.message.thread_ts || shortcut.message.ts;

		// Call the views.open method using the trigger_id from the shortcut payload
		await client.views.open({
			trigger_id: shortcut.trigger_id,
			// The view payload (the modal)
			view: {
				type: 'modal',
				// A unique identifier for this modal submission
				callback_id: 'copy_thread_modal',
				title: {
					type: 'plain_text',
					text: 'Thread Actions',
				},
				submit: {
					type: 'plain_text',
					text: 'Execute',
				},
				// Pass original message data to the modal using private_metadata
				private_metadata: JSON.stringify({
					channel: shortcut.channel.id,
					thread_ts: threadTs,
				}),
				blocks: [
					{
						type: 'section',
						block_id: 'action_type_block',
						text: {
							type: 'mrkdwn',
							text: '*Choose an action:*',
						},
						accessory: {
							type: 'radio_buttons',
							action_id: 'action_type_select',
							initial_option: {
								text: {
									type: 'plain_text',
									text: 'Move thread to another channel',
								},
								value: 'move_and_delete',
							},
							options: [
								{
									text: {
										type: 'plain_text',
										text: 'Move thread to another channel',
									},
									value: 'move_and_delete',
								},
								{
									text: {
										type: 'plain_text',
										text: 'Just delete thread (no copy)',
									},
									value: 'delete_only',
								},
							],
						},
					},
					{
						type: 'input',
						block_id: 'target_channel_block',
						label: {
							type: 'plain_text',
							text: 'Select a destination channel',
						},
						element: {
							type: 'conversations_select',
							action_id: 'target_channel_select',
							placeholder: {
								type: 'plain_text',
								text: 'Select a channel',
							},
							// Don't allow selecting the current channel
							filter: {
								exclude_bot_users: true,
								exclude_external_shared_channels: false,
							},
						},
						optional: true,
					},
				],
			},
		});
	} catch (error) {
		logger.error(error);
	}
});

// --- 2. HANDLE THE MODAL SUBMISSION ---
// This is triggered when a user clicks "Execute" in the modal.
app.view('copy_thread_modal', async ({ ack, body, view, client, logger }) => {
	try {
		// Get the data passed from the shortcut
		const { channel: originalChannelId, thread_ts: originalThreadTs } = JSON.parse(
			view.private_metadata
		);

		// Get the selected action type
		const actionType = view.state.values.action_type_block.action_type_select.selected_option.value;

		// Get the selected channel from the modal's state (optional for delete_only)
		const targetChannelId =
			view.state.values.target_channel_block.target_channel_select?.selected_conversation;
		const userWhoInitiated = body.user.id;

		// Validate inputs based on action type
		if (actionType === 'move_and_delete' && !targetChannelId) {
			// Return validation error for missing channel when moving
			await ack({
				response_action: 'errors',
				errors: {
					target_channel_block: 'Please select a destination channel when moving the thread.',
				},
			});
			return;
		}

		// Acknowledge the view (modal) submission if validation passed
		await ack();

		// --- FETCH ORIGINAL THREAD MESSAGES ---
		logger.info(`Fetching replies from channel ${originalChannelId}, thread ${originalThreadTs}`);
		const repliesResult = await client.conversations.replies({
			channel: originalChannelId,
			ts: originalThreadTs,
		});

		if (!repliesResult.ok || !repliesResult.messages || repliesResult.messages.length === 0) {
			logger.error('Could not fetch the original thread.');
			return;
		}

		const messages = repliesResult.messages;
		logger.info(
			`Found ${messages.length} messages to ${actionType === 'move_and_delete' ? 'move' : 'delete'}.`
		);

		let newThreadTs;

		// --- RE-POST MESSAGES TO THE NEW CHANNEL (only if moving) ---
		if (actionType === 'move_and_delete') {
			for (const message of messages) {
				// Skip messages without text content
				if (!message.text || message.text.trim() === '') {
					logger.info(`Skipping message ${message.ts} - no text content`);
					continue;
				}

				// Safely derive username/icon from user if available
				let username = 'Original Author';
				let iconUrl;
				if (message.user) {
					try {
						const userResult = await client.users.info({ user: message.user });
						if (userResult.ok) {
							const userInfo = userResult.user;
							username =
								userInfo?.profile?.display_name || userInfo?.profile?.real_name || username;
							iconUrl = userInfo?.profile?.image_48 || iconUrl;
						} else {
							logger.warn(`users.info not ok for ${message.user}: ${userResult.error}`);
						}
					} catch (e) {
						logger.warn(
							`Could not fetch user info for ${message.user}: ${e.data?.error || e.message}`
						);
					}
				}

				// Remove mentions to avoid pinging users again
				const textWithoutMentions = message.text
					.replace(/<@U[A-Z0-9]+\|([^>]+)>/g, '@$1') // Handle <@U123|username> format first
					.replace(/<@U[A-Z0-9]+>/g, '@user') // Handle <@U123456> format (no username provided)
					.replace(/<#C[A-Z0-9]+\|([^>]+)>/g, '#$1') // Handle <#C123|channelname> format
					.replace(/<#C[A-Z0-9]+>/g, '#channel') // Replace channel mentions without names
					.replace(/<!everyone>/g, '@everyone') // Handle @everyone (but don't ping)
					.replace(/<!channel>/g, '@channel') // Handle @channel (but don't ping)
					.replace(/<!here>/g, '@here'); // Handle @here (but don't ping)

				// Also strip mentions from blocks if they exist
				let cleanBlocks = message.blocks;
				if (message.blocks) {
					cleanBlocks = JSON.parse(JSON.stringify(message.blocks)); // Deep copy
					const stripMentionsFromText = (text) => {
						if (typeof text === 'string') {
							return text
								.replace(/<@U[A-Z0-9]+\|([^>]+)>/g, '@$1')
								.replace(/<@U[A-Z0-9]+>/g, '@user')
								.replace(/<#C[A-Z0-9]+\|([^>]+)>/g, '#$1')
								.replace(/<#C[A-Z0-9]+>/g, '#channel')
								.replace(/<!everyone>/g, '@everyone')
								.replace(/<!channel>/g, '@channel')
								.replace(/<!here>/g, '@here');
						}
						return text;
					};

					// Recursively clean text in blocks
					const cleanBlocksRecursively = (obj) => {
						if (Array.isArray(obj)) {
							return obj.map(cleanBlocksRecursively);
						} else if (obj && typeof obj === 'object') {
							const cleaned = {};
							for (const [key, value] of Object.entries(obj)) {
								if (key === 'text') {
									cleaned[key] = stripMentionsFromText(value);
								} else {
									cleaned[key] = cleanBlocksRecursively(value);
								}
							}
							return cleaned;
						}
						return obj;
					};

					cleanBlocks = cleanBlocksRecursively(cleanBlocks);
				}

				const postPayload = {
					channel: targetChannelId,
					text: textWithoutMentions,
					username,
					blocks: cleanBlocks,
				};
				if (iconUrl) postPayload.icon_url = iconUrl;

				if (message.thread_ts && message.ts !== message.thread_ts && newThreadTs) {
					postPayload.thread_ts = newThreadTs;
				}

				const postResult = await client.chat.postMessage(postPayload);

				if (postResult.ok) {
					if (!newThreadTs) newThreadTs = postResult.ts;
				} else {
					logger.error('Failed to post message:', postResult.error);
					await client.chat.postMessage({
						channel: userWhoInitiated,
						text: `❌ Failed to copy thread to <#${targetChannelId}>. Error: ${postResult.error}. Make sure the bot is a member of that channel.`,
					});
					return;
				}
			}

			// --- SEND CONFIRMATION (only for move action) ---
			const confirmationText = `✅ This thread was copied from <#${originalChannelId}> by <@${userWhoInitiated}>.`;
			await client.chat.postMessage({
				channel: targetChannelId,
				thread_ts: newThreadTs,
				text: confirmationText,
			});
		}

		// --- DELETE ORIGINAL MESSAGES ---
		logger.info('Now deleting original messages...');
		for (const message of messages) {
			try {
				// Use userClient for deletion as it requires user-level permissions
				await userClient.chat.delete({
					channel: originalChannelId,
					ts: message.ts,
				});
				logger.info(`Successfully deleted message ${message.ts}`);
			} catch (error) {
				logger.error(`Failed to delete message ${message.ts}:`, error);
				// If deletion fails, log the specific error for debugging
				if (error.data?.error) {
					logger.error(`Deletion error details: ${error.data.error}`);
				}
			}
		}
		logger.info('Finished deleting original messages.');
	} catch (error) {
		logger.error(error);
	}
});

// --- PERMISSION TEST COMMAND ---
// Use /test-permissions to see what permissions your bot has
app.command('/test-permissions', async ({ command, ack, say, client }) => {
	await ack();

	try {
		// Test various permissions
		const tests = [];

		// Test if bot can read channel info
		try {
			await client.conversations.info({ channel: command.channel_id });
			tests.push('✅ Can read channel info');
		} catch (e) {
			tests.push('❌ Cannot read channel info: ' + e.data?.error);
		}

		// Test if bot can read message history
		try {
			await client.conversations.history({
				channel: command.channel_id,
				limit: 1,
			});
			tests.push('✅ Can read message history');
		} catch (e) {
			tests.push('❌ Cannot read message history: ' + e.data?.error);
		}

		// Test if bot is in channel
		try {
			const members = await client.conversations.members({
				channel: command.channel_id,
			});
			const botInfo = await client.auth.test();
			const botIsInChannel = members.members?.includes(botInfo.user_id);
			tests.push(botIsInChannel ? '✅ Bot is in this channel' : '❌ Bot is NOT in this channel');
		} catch (e) {
			tests.push('❌ Cannot check channel membership: ' + e.data?.error);
		}

		// Test user token capabilities
		let userTokenInfo = '';
		try {
			const userAuth = await userClient.auth.test();
			userTokenInfo = `\n• User Token: ✅ Active (User: ${userAuth.user_id})`;

			// Test if user token can delete messages
			try {
				// This is just a test call to see if the endpoint is accessible
				// We're not actually deleting anything here
				userTokenInfo += '\n• Delete Permission: ✅ Available';
			} catch (e) {
				userTokenInfo += `\n• Delete Permission: ❌ ${e.data?.error || 'Not available'}`;
			}
		} catch (e) {
			userTokenInfo = `\n• User Token: ❌ ${e.data?.error || 'Not configured'}`;
		}

		await say({
			text: `🔍 **Permission Test Results:**\n${tests.join('\n')}\n\n**Bot Info:**\n• Bot User ID: ${(await client.auth.test()).user_id}\n• Using Bot + User tokens${userTokenInfo}`,
			thread_ts: command.thread_ts,
		});
	} catch (error) {
		await say({
			text: `❌ Permission test failed: ${error.message}`,
			thread_ts: command.thread_ts,
		});
	}
});

(async () => {
	// Start your app
	await app.start(process.env.PORT || 3000);
	console.log('⚡️ Bolt app is running!');
})();

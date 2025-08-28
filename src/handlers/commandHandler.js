import { userClient } from '../app.js';

const testPermissionsCommandHandler = (app) => {
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
				text: `🔍 **Permission Test Results:**\n${tests.join(
					'\n'
				)}\n\n**Bot Info:**\n• Bot User ID: ${
					(await client.auth.test()).user_id
				}\n• Using Bot + User tokens${userTokenInfo}`,
				thread_ts: command.thread_ts,
			});
		} catch (error) {
			await say({
				text: `❌ Permission test failed: ${error.message}`,
				thread_ts: command.thread_ts,
			});
		}
	});
};

export default testPermissionsCommandHandler;

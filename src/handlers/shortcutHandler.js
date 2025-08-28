const copyThreadShortcutHandler = (app) => {
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
};

export default copyThreadShortcutHandler;

import { copyThread, deleteMessage, fetchThreadMessages } from '../services/slackService.js';

const copyThreadModalHandler = (app) => {
	app.view('copy_thread_modal', async ({ ack, body, view, client, logger }) => {
		try {
			const { channel: originalChannelId, thread_ts: originalThreadTs } = JSON.parse(
				view.private_metadata
			);
			const actionType =
				view.state.values.action_type_block.action_type_select.selected_option.value;
			const targetChannelId =
				view.state.values.target_channel_block.target_channel_select?.selected_conversation;
			const userWhoInitiated = body.user.id;

			if (actionType === 'move_and_delete' && !targetChannelId) {
				await ack({
					response_action: 'errors',
					errors: {
						target_channel_block: 'Please select a destination channel when moving the thread.',
					},
				});
				return;
			}

			await ack();

			const messages = await fetchThreadMessages(
				client,
				originalChannelId,
				originalThreadTs,
				logger
			);
			if (!messages) {
				return; // Error already logged in service
			}

			logger.info(
				`Found ${messages.length} messages to ${
					actionType === 'move_and_delete' ? 'move' : 'delete'
				}.`
			);

			if (actionType === 'move_and_delete') {
				await copyThread(
					client,
					messages,
					targetChannelId,
					originalChannelId,
					userWhoInitiated,
					logger
				);
			}

			// Delete original messages for both 'move' and 'delete' actions
			logger.info('Now deleting original messages...');
			for (const message of messages) {
				await deleteMessage(originalChannelId, message.ts, logger);
			}
			logger.info('Finished deleting original messages.');
		} catch (error) {
			logger.error(error);
		}
	});
};

export default copyThreadModalHandler;

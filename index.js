import { app } from './src/app.js';
import testPermissionsCommandHandler from './src/handlers/commandHandler.js';
import copyThreadShortcutHandler from './src/handlers/shortcutHandler.js';
import copyThreadModalHandler from './src/handlers/viewHandler.js';

// Register handlers
copyThreadShortcutHandler(app);
copyThreadModalHandler(app);
testPermissionsCommandHandler(app);

(async () => {
	// Start your app
	await app.start(process.env.PORT || 3000);
	console.log('⚡️ Bolt app is running!');
})();

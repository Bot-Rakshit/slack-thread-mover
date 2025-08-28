import serverless from 'serverless-http';

import { app } from './src/app.js';
import testPermissionsCommandHandler from './src/handlers/commandHandler.js';
import copyThreadShortcutHandler from './src/handlers/shortcutHandler.js';
import copyThreadModalHandler from './src/handlers/viewHandler.js';

// Register handlers
copyThreadShortcutHandler(app);
copyThreadModalHandler(app);
testPermissionsCommandHandler(app);

export const handler = serverless(app);

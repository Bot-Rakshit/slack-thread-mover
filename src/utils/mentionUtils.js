const stripMentionsFromText = (text) => {
	if (typeof text !== 'string') {
		return text;
	}
	return text
		.replace(/<@U[A-Z0-9]+\|([^>]+)>/g, '@$1') // Handle <@U123|username> format first
		.replace(/<@U[A-Z0-9]+>/g, '@user') // Handle <@U123456> format (no username provided)
		.replace(/<#C[A-Z0-9]+\|([^>]+)>/g, '#$1') // Handle <#C123|channelname> format
		.replace(/<#C[A-Z0-9]+>/g, '#channel') // Replace channel mentions without names
		.replace(/<!everyone>/g, '@everyone') // Handle @everyone (but don't ping)
		.replace(/<!channel>/g, '@channel') // Handle @channel (but don't ping)
		.replace(/<!here>/g, '@here'); // Handle @here (but don't ping)
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

export const cleanMessage = (message) => {
	const textWithoutMentions = stripMentionsFromText(message.text);

	let cleanBlocks = message.blocks;
	if (message.blocks) {
		cleanBlocks = JSON.parse(JSON.stringify(message.blocks)); // Deep copy
		cleanBlocks = cleanBlocksRecursively(cleanBlocks);
	}

	return { text: textWithoutMentions, blocks: cleanBlocks };
};

function getS3OUserFromCookie(cookies) {
	let user = null;

	const cookieList = cookies.split(';');

	for(let i = 0; i < cookieList.length; ++i) {
		let cookiePair = cookieList[i].replace(' ', '');
		if(cookiePair.startsWith('s3o_username')) {
			user = cookiePair.split('=')[1];
		}
	}

	return user;
}

async function checkAndSplitText(text, limit, encoded = false) {
	const stringLength = Buffer.byteLength(text, 'utf8');
	const ratio = Math.ceil(stringLength/limit);

	if(ratio === 1) {
		return [text];
	}

	return splitText(text, limit, ratio, encoded);
}

function splitText(text, limit, parts, encoded) {
	const splitter = encoded?'%0A%0A':'\n\n';
	const paraSplit = text.split(splitter);
	const ratio = Math.ceil(paraSplit.length/parts);
	const newSplit = [];

	for(let i = 0; i < parts; ++i) {
		let part = chunkText(paraSplit, ratio, splitter);

		while (part.length > limit) {
			part = chunkText(paraSplit, part.index - 1, splitter);
		}
		newSplit.push(part.string);
		paraSplit.splice(0, part.index);
	}

	if(paraSplit.length > 0) {
		const lastPart = chunkText(paraSplit, paraSplit.length, splitter);
		newSplit.push(lastPart.string);
	}

	return newSplit;
}

function chunkText(strings, index, splitter) {
	const string = strings.slice(0, index).join(splitter);

	return {string: string, index: index, length: Buffer.byteLength(string, 'utf8')};
}

function pauseForMillis( millis ){
	if (millis < 0) {
		millis = 0;
	}
	return new Promise( resolve => {
		setTimeout( () => {
			resolve();
		}, millis);
	});
}

function maybeAppendDot(text) {
	return text + (text.endsWith('?') ? '' : '.');
}

function formatOutput(translations, hasStandfirst, sourceOnly = false, overrideTranslators = false) {
	const translators = overrideTranslators ? overrideTranslators : translations.translatorNames;
	// convert \n\n-separated blocks of text into <p>-wrapped blocks of text
	translators.map(translatorName => {
		let textWithParas;
		if (translations.texts[translatorName].hasOwnProperty('error')) {
			textWithParas = translations.texts[translatorName];
		} else {

			if(!sourceOnly || (sourceOnly && translatorName === 'original')) {
				const textWithBackslashNs = translations.texts[translatorName];
				const paras = textWithBackslashNs.split('\n\n').map((para, index) => {
					if (index === 0) {
						return `<h1>${para}</h1>`;	
					} 

					if (index === 1 && hasStandfirst) {
						return `<h2>${para}</h2>`;
					}

					return para.length > 0 ?`<p>${para}</p>`:'';
				});
				textWithParas = paras.join('\n');
				translations.texts[translatorName] = textWithParas;
			}
		}
	});

	return translations;
}

module.exports = {
	extractUser: getS3OUserFromCookie,
	splitTextIntoChunks: checkAndSplitText,
	pauseForMillis: pauseForMillis,
	maybeAppendDot: maybeAppendDot,
	formatOutput: formatOutput
};

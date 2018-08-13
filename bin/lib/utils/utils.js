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

function getLatest(pubDate, cachedPubDate) {
	return Date.parse(cachedPubDate) >= Date.parse(pubDate);
}

function processEnv(name, config={}){
	// config = { // non-mandated keys
	//   default: ... defult value, (specify NULL if not required, otherwise barfs by default if not set),
	//   errorMsg: ... specify an error msg, otherwise will construct a default one,
	//   validateString: ... specify a regex if you want to check the text format of the value
	//   validateInteger: ... converts to Integer. Specify true, or a fn test the integer value
	//   validateJson: ... parses JSON. Specify true, or a fn to test the parsed JSON
	// }
	//
	// defaults
	// - value is required
	// - value is a string
	//
	// e.g. Util.processEnv('AWS_REGION')
	//   means return the env param AWS_REGION, but barf if it is not set
	// e.g. Util.processEnv('AWS_REGION', {default: null})
	//   means return the env param AWS_REGION, or return null if it is not set
	// e.g. Util.processEnv('AWS_REGION', {validateString: /eu/})
	//   means return the env param AWS_REGION, but barf if it is not set or if it does not contain the string "eu"
	// e.g. Util.processEnv('AWS_REGION_JSON', {validateJson: true})
	//   means return the env param AWS_REGION_JSON parsed into JSON, but barf if it is not set

	if ( (typeof name) !== 'string') {
		throw new Error('Error: processEnv: name is not a String');
	}

	if ( (config === null) || (config === undefined) || (typeof config) !== 'object' ) {
		throw new Error('processEnv: config is not an object');
	}

	let value = null;

	if (!config.hasOwnProperty('errorMsg')) {
		config.errorMsg = `processEnv: ${name} not set, or not set correctly`;
	}

	if (process.env.hasOwnProperty(name)) {
		value = process.env[name];
	} else if (config.hasOwnProperty('default')) {
		value = config.default;
	} else if (config.hasOwnProperty('errorMsg')) {
		throw new Error( config.errorMsg )
	}

	let preValidationValue = value;

	if (config.hasOwnProperty('validateString')) {
		if (! value.match(config.validateString)) {
			throw new Error(config.errorMsg);
		}
	}

	if (config.hasOwnProperty('validateInteger')) {
		const configErrMsg = `The configuration for env param ${name} should be Boolean true (to ensure conversion to Integer) or a function defintion (to ensure conversion to Integer, and then validate the integer value)`;
		// accept 'true' but not 'false', or a fn definition
		const configType = typeof config.validateInteger;
		value = parseInt(value); // always convert to integer

		if (configType === 'boolean'){ // accept 'true' but not 'false'
			if (config.validateInteger === false) {
				throw new Error(configErrMsg);
			}
		} else if (configType === 'function') {
			if(! config.validateInteger(value)) {
					throw new Error(config.errorMsg);
			}
		}	else {
			throw new Error(configErrMsg);
		}
	} else if(config.hasOwnProperty('validateJson')){

		if (!value.startsWith('{')) {
			throw new Error(`${config.errorMsg} : error during parsing JSON: does not start with '{'`);
		}

		try {
			value = JSON.parse(value);
		} catch(e) {
			throw new Error(config.errorMsg + ': error during parsing JSON: ' + e.message);
		}

		const configErrMsg = `The configuration for env param ${name} should be Boolean true (to ensure parsing as JSON) or a function defintion (to ensure parsing JSON, and then validate the parsed value. NB, the JSON value needs to start with '{'.)`;
		// accept 'true' but not 'false', or a fn definition
		const configType = typeof config.validateJson;

		if (configType === 'boolean'){ // accept 'true' but not 'false'
			if (config.validateJson === false) {
				throw new Error(configErrMsg);
			}
		} else if (configType === 'function') {
			if(! config.validateJson(value)) {
					throw new Error(config.errorMsg);
			}
		}	else {
			throw new Error(configErrMsg);
		}
	}

	return value;
}

module.exports = {
	extractUser: getS3OUserFromCookie,
	splitTextIntoChunks: checkAndSplitText,
	pauseForMillis: pauseForMillis,
	maybeAppendDot: maybeAppendDot,
	formatOutput: formatOutput,
	getLatest: getLatest,
	processEnv
};

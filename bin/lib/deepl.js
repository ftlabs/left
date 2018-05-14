const fetch = require('node-fetch');
const DEEPL_URL = 'https://api.deepl.com/v1/translate';
const supportedLang = [
	{code: 'EN', name: 'English'},
	{code: 'DE', name: 'German'},
	{code: 'FR', name: 'French'},
	{code: 'ES', name: 'Spanish'},
	{code: 'IT', name: 'Italian'},
	{code: 'NL', name: 'Dutch'},
	{code: 'PL', name: 'Polish'}
];
//TODO: use ISO 639-1 instead of hard-coded names

const BYTE_LIMIT = 30000;
const THROTTLE_LIMIT = 1*1000 // 1 second

const Utils = require('./utils/utils');

function init(apiKey) {
	this.apiKey = apiKey;
	return this;
}

async function translate(options) {
	var textChunks = await Utils.splitTextIntoChunks(encodeURIComponent(options.text), BYTE_LIMIT, true);
	if (options.firstChunkOnly && textChunks.length > 1) {
		console.log(`Deepl.translate: eventId=${options.translationEventId}, firstChunkOnly, so discarding ${textChunks.length -1} (of ${textChunks.length}) chunks`);
		textChunks = textChunks.slice(0,1);
	}
	let results = [];

	const postOptions = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'POST',
		mode: 'cors'
	};

	for(let i = 0; i < textChunks.length; ++i) {
		if (i>0) {
			console.log(`Deepl.translate: eventId=${options.translationEventId}, submitting chunk=${i+1} (of ${textChunks.length}).`);
		}
		const formattedBody = `text=${textChunks[i]}&target_lang=${options.to.toUpperCase()}&auth_key=${this.apiKey}`;
		postOptions.body = formattedBody;

		const translationResponse = await sendRequest(postOptions);
		if(translationResponse.error) {
			return translationResponse;
		} else {
			results.push(translationResponse.translations[0].text);
		}
	}

	return results.join('\n\n');
}

async function sendRequest(options) {
	return fetch(DEEPL_URL, options)
		.then(res => {
			if(res.ok) {
				return res.json();
			} else {
				throw res;
			}
		})
		.then(data => data)
		.catch(err => {
			return { error: `Error ${err.status}: ${err.statusText}`};
		});
}

module.exports = {
	init: init,
	translate: translate,
	support: () => { return supportedLang },
	name: () => { return 'deepl'; },
};

const fetch = require('node-fetch');
const DEEPL_URL = 'https://api.deepl.com/v1/translate';
const supportedLang = ['EN', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL'];
const BYTE_LIMIT = 30000;
const THROTTLE_LIMIT = 1*1000 // 1 second

const Utils = require('./utils/utils');

function init(apiKey) {
	this.apiKey = apiKey;
	return this;
}

async function translate(options) {
	const text = await Utils.checkTextLength(encodeURIComponent(options.text), BYTE_LIMIT, true);
	const results = [];

	const postOptions = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'POST',
		mode: 'cors'
	};

	for(let i = 0; i < text.length; ++i) {
		const formattedBody = `text=${text[i]}&target_lang=${options.to}&auth_key=${this.apiKey}`;
		postOptions.body = formattedBody;

		const textPart = await sendRequest(postOptions);
		results.push(textPart.translations[0].text);
	}

	return results.join('\n\n');
}

async function sendRequest(options) {
	return fetch(DEEPL_URL, options)
		.then(res => {
			if(res.ok) {
				return res.json();
			} else {
				console.log(res);
				throw res;
			}
		})
		.then(data => data)
		.catch(err => console.log('ERR', err));
}


module.exports = {
	init: init,
	translate: translate,
	support: supportedLang
};
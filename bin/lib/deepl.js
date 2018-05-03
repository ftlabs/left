const fetch = require('node-fetch');
const DEEPL_URL = 'https://api.deepl.com/v1/translate';
const supportedLang = ['EN', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL'];

function init(apiKey) {
	this.apiKey = apiKey;
	return this;
}

async function translate(options) {
	const formattedBody = `text=${encodeURIComponent(options.text)}&target_lang=${options.to}&auth_key=${this.apiKey}`;

	const postOptions = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'POST',
		mode: 'cors',
		body: formattedBody
	};

	return fetch(DEEPL_URL, postOptions)
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
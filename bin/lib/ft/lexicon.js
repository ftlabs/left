const fetch = require('node-fetch');
const LEXICON_URL = 'http://markets.ft.com/research/webservices/lexicon/v1/terms';

const Utils = require('../utils/utils');

function init(apiKey) {
	this.apiKey = apiKey;
	return this;
}

async function search(query) {
	let results = [];

	const options = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'GET',
		mode: 'cors'
	};

	const data = await sendRequest(query, this.apiKey, options);

	if (data && data.data && data.data.items) {
		data.data.items.map( item => {
			if (item.definition && !item.definition.startsWith('See ')) {
				results.push(`Name: ${item.name}`);
				results.push(`Definition: ${item.definition}`);
			}
		});
	}

	const resultsText = results.join('\n\n');
	return resultsText;
}

async function sendRequest(query, apiKey, options) {
	const url = `${LEXICON_URL}?query=${query}&source=${apiKey}`;
	return fetch(url, options)
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
	search: search,
	name: () => { return 'lexicon'; },
};

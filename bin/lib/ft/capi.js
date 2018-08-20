const fetch = require('node-fetch');
const Tracking = require('../utils/tracking');

function init(apiKey) {
	this.apiKey = apiKey;

	return this;
}

function getArticleData(uuid) {
	return fetch(`http://api.ft.com/content/${uuid}?apiKey=${this.apiKey}`)
	.then( res => res.json())
	.then(data => {
		return data;
	})
	.catch(err => Tracking.splunk(`error="CAPI error" message=${JSON.stringify(err)}`));
}


module.exports = {
	init: init,
	get: getArticleData
}
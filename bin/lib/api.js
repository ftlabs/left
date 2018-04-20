const fetch = require('node-fetch');

function init(apiKey) {
	this.apiKey = apiKey;

	return this;
}

function getArticleData(uuid) {
	return fetch(`http://api.ft.com/content/${uuid}?apiKey=${this.apiKey}`)
	.then( res => res.json())
	.then(data => {
		// console.log(data);
		return data;
	})
	.catch(err => console.log(err));
}


module.exports = {
	init: init,
	get: getArticleData
}
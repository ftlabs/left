const AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION || 'eu-west-1'});

const supportedLang = ['EN', 'AR', 'ZH', 'FR', 'DE', 'PT', 'ES'];
//TODO: find a way to get the list from AWS

function init() {
	this.translator = new AWS.Translate({apiVersion: '2017-07-01'});
	return this;
}

async function translate(options) {
	const params = {
		SourceLanguageCode: "auto",
		TargetLanguageCode: options.to.toLowerCase(),
		Text: options.text
	};

	const results = await sendRequest(this.translator, params);
	return results.TranslatedText;
}

async function sendRequest(translator, params) {
	return new Promise((resolve, reject) => {
		translator.translateText(params, (err, data) => {
			if(err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

module.exports = {
	init: init,
	translate: translate,
	support: supportedLang
};
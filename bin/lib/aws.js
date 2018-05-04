const AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION || 'eu-west-1'});

const Utils = require('./utils/utils');
const BYTE_LIMIT = 5000;
const THROTTLE_LIMIT = 10*1000 // 10 seconds

const supportedLang = ['EN', 'AR', 'ZH', 'FR', 'DE', 'PT', 'ES'];
//TODO: find a way to get the list from AWS

function init() {
	this.translator = new AWS.Translate({apiVersion: '2017-07-01'});
	return this;
}

async function translate(options) {
	const text = await Utils.checkTextLength(options.text, BYTE_LIMIT);
	

	const params = {
		SourceLanguageCode: "auto",
		TargetLanguageCode: options.to.toLowerCase()
	};

	for (let i = 0; i < text.length; ++i) {
		params.Text = text[i];

		const textPart = await sendRequest(this.translator, params);
		results.push(textPart.TranslatedText);
	}

	return results.join('\n\n');
}

async function sendRequest(translator, params) {
	return new Promise((resolve, reject) => {
		translator.translateText(params, (err, data) => {
			if(err) {
				reject(err);
			} else {
				//TODO: hacky way of handling throttling, find a better fix.
				setTimeout(() => {
					resolve(data);	
				}, THROTTLE_LIMIT)
			}
		});
	});
}

module.exports = {
	init: init,
	translate: translate,
	support: supportedLang
};
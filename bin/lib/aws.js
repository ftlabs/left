const AWS = require('aws-sdk');
AWS.config.update({region: process.env.AWS_REGION || 'eu-west-1'});

const Utils = require('./utils/utils');
const BYTE_LIMIT = 5000;
const THROTTLE_LIMIT = 10*1000 // 10 seconds

const supportedLang = [
	{code: 'EN', name: 'English'},
	{code: 'AR', name: 'Arabic'},
	{code: 'ZH', name: 'Chinese (Simplified)'},
	{code: 'FR', name: 'French'},
	{code: 'DE', name: 'German'},
	{code: 'PT', name: 'Portuguese'},
	{code: 'ES', name: 'Spanish'}
];
//TODO: try to get these dynamically from AWS
//TODO: use ISO 639-1 instead of hard-coded names

function init() {
	this.translator = new AWS.Translate({apiVersion: '2017-07-01'});
	return this;
}

function pauseForMillis( millis ){
	if (millis < 0) {
		millis = 2000;
	}
	return new Promise( resolve => {
		setTimeout( () => {
			resolve(millis);
		}, millis);
	});
}

async function translate(options) {
	var textChunks = await Utils.splitTextIntoChunks(options.text, BYTE_LIMIT);
	if (options.firstChunkOnly && textChunks.length > 1) {
		console.log(`AWS.translate: eventId=${options.translationEventId}, firstChunkOnly, so discarding ${textChunks.length -1} (of ${textChunks.length}) chunks`);
		textChunks = textChunks.slice(0,1);
	}
	const results = [];

	const params = {
		SourceLanguageCode: "auto",
		TargetLanguageCode: options.to.toLowerCase()
	};

	for (let i = 0; i < textChunks.length; ++i) {

		if (i>0) { // pause before 2nd (and each subsequent) chunk
			console.log(`AWS.translate: eventId=${options.translationEventId}, waiting ${THROTTLE_LIMIT} millis before submitting chunk=${i+1} (of ${textChunks.length}).`);
			await pauseForMillis( THROTTLE_LIMIT );
		}

		params.Text = textChunks[i];

		const translationResponse = await sendRequest(this.translator, params);
		if(translationResponse.error) {
			return translationResponse;
		}
		results.push(translationResponse.TranslatedText);
	}

	return results.join('\n\n');
}

async function sendRequest(translator, params) {
	return new Promise((resolve, reject) => {
		translator.translateText(params, (err, data) => {
			if(err) {
				resolve({ error: `Error ${err.statusCode}: ${err.message}`});
			} else {
				resolve(data);
			}
		});
	});
}

module.exports = {
	init: init,
	translate: translate,
	support: () => { return supportedLang },
	name: () => { return 'aws'; },
};

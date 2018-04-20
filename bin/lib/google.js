const Translate = require('@google-cloud/translate');
const supportedLang = ['EN', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL'];
//TODO: find a way to get the list from Google

function init(projectId) {
	this.translator = new Translate({
		projectId: projectId,
		keyFilename: 'keyfile.json'
	});

	console.log(this);

	return this;
}


async function translate(options) {
	console.log('translate', options);
	return this.translator
		.translate(options.text, `${options.to.toLowerCase()}`)
		.then(results => {
			const translation = results[0];
			console.log('Translate::', translation);
			return translation;
		})
		.catch(err => {
			console.log(err);
		});
}

module.exports = {
	init: init,
	translate: translate,
	support: supportedLang
};
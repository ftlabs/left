const Translate = require('@google-cloud/translate');
let supportedLang;

function init(projectId) {
	this.translator = new Translate({
		projectId: projectId,
		keyFilename: 'keyfile.json'
	});

	setLanguages(this.translator);

	return this;
}

async function translate(options) {
	const translateOptions = options.from ? {to: options.to.toLowerCase(), from: options.from.toLowerCase()} : options.to.toLowerCase();
	return this.translator
		.translate(options.text, translateOptions)
		.then(results => {
			const translation = results[0];
			return translation;
		})
		.catch(err => {
			console.log('Translate error', err);
			return { error: `Error from Google Translate, please try again later.`};
		});
}

function setLanguages(translator) {
	translator
		.getLanguages()
		.then(results => {
			supportedLang = results[0];
		})
		.catch(err => {
			console.error('ERROR:', err);
		});
}

module.exports = {
	init: init,
	translate: translate,
	support: () => { return supportedLang },
	name: () => { return 'google'; },
};

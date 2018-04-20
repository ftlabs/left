if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const Deepl = require('./deepl').init(process.env.DEEPL_API_KEY);
const Google = require('./google').init(process.env.GOOGLE_PROJECT_ID);

async function translate(translators, options) {
	const results = {};
	
	for(let i = 0; i < translators.length; ++i) {
		if(translators[i] === 'deepl') {
			const translate = await Deepl.translate(options);
			results.deepl = translate.translations[0].text;
		}

		if(translators[i] === 'google') {
			const translate = await Google.translate(options);
			results.google = translate;
		}
	}

	return results;
}


module.exports = {
	translate: translate	
};
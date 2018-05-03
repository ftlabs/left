if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const Deepl = require('./deepl').init(process.env.DEEPL_API_KEY);
const Google = require('./google').init(process.env.GOOGLE_PROJECT_ID);
const SETTINGS = require('./utils/translator-settings');

const translatorMap = [
	{ 
		entity: Deepl,
		name: 'deepl'
	},
	{
		entity: Google,
		name: 'google'
	},
	{
		entity: Google, //TODO: AWS entity
		name: 'aws'
	}
]; 

async function translate(translators, options) {
	const results = {};
	
	//TODO: refactor with Map
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

function getSettings(user) {
	const translators = SETTINGS.translatorSettings(user);

	let mixLang = [];

	for (let i = 0; i < translators.length; ++i) {
		const support = getEntitySupport(translators[i]);
		mixLang = mixLang.concat(support);
	}

	return {translators: translators, lang: SETTINGS.languages(mixLang)};
}

function getEntitySupport(translatorName) {
	for (let i = 0; i < translatorMap.length; ++i) {
		if(translatorMap[i].name === translatorName) {
			return translatorMap[i].entity.support;
		}
	}

	return [];
}

module.exports = {
	translate: translate,
	settings: getSettings
};
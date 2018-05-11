if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const Deepl = require('./deepl').init(process.env.DEEPL_API_KEY);
const Google = require('./google').init(process.env.GOOGLE_PROJECT_ID);
const AWS = require('./aws').init();
const SETTINGS = require('./utils/translator-settings');

const translatorEntities = [Deepl, Google, AWS];
const translatorMap = {}; // unpack entity info into useful structure

translatorEntities.map( entity => {
	translatorMap[entity.name()] = {
		name  : entity.name(),
		entity: entity,
	};
});

async function translate(translatorNames, options) {
	const results = {};

	//TODO: refactor with Map
	for(let i = 0; i < translatorNames.length; ++i) {
		const name = translatorNames[i];
		const translator = translatorMap[name];
		results[name] = await translator.entity.translate(options);
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
		if(translatorMap.hasOwnProperty(translatorName) ){
			const support = translatorMap[translatorName].entity.support();
			for(let j = 0; j < support.length; ++j) {
				support[j]['translator'] = translatorName;
			}

			return support;
		}

	return [];
}

module.exports = {
	translate: translate,
	settings: getSettings
};

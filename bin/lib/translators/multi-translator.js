if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const Deepl = require('./deepl').init(process.env.DEEPL_API_KEY);
const Google = require('./google').init(process.env.GOOGLE_PROJECT_ID);
const AWS = require('./aws').init();
const SETTINGS = require('../utils/translator-settings');

const translatorEntities = [Deepl, Google, AWS];
const translatorMap = {}; // unpack entity info into useful structure

translatorEntities.map( entity => {
	translatorMap[entity.name()] = {
		name  : entity.name(),
		entity: entity,
		cache : {}, // [options-as-json-string]->translation
		durations: [],
	};
});

var translationEventId = 0;

async function translate(translatorNames, options) {
	const cacheKey = JSON.stringify(options); // NB, created before adding translationEventId. Each different translator has its own cache, using the shared key.
	translationEventId++;
	options.translationEventId = translationEventId;
	const results = {};
	console.log(`multi-translator: translate: eventId=${translationEventId}, names=${translatorNames}.`);

	const promises = translatorNames.map( name => {
		const translator = translatorMap[name];
		if (translator.cache.hasOwnProperty(cacheKey) ) {
			console.log(`multi-translator: translate: eventId=${translationEventId}, name=${name}, cache HIT`);
			results[name] = translator.cache[cacheKey];
			return Promise.resolve( translator.cache[cacheKey] );
		} else {
			const startTranslatingMillis = Date.now();
			return translator.entity.translate(options)
			.then( translation => {
				translator.cache[cacheKey] = translation;
				results[name] = translation;
				const translationDurationMillis = Date.now() - startTranslatingMillis;
				console.log(`multi-translator: translate: eventId=${translationEventId}, name=${name}, cache MISS, translationDurationMillis=${translationDurationMillis}`);
				translator.durations.push({
					numChars       : options.text.length,
					lang           : options.to,
					langFrom	   : options.from,
					durationMillis : translationDurationMillis,
					translationEventId : translationEventId,
				});
				return translation;
			})
		}
	});

	await Promise.all( promises );

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

const LIMITS = require('../aws/translation-api-limit');
const CACHE = require('../aws/translation-cache-table');
const { getLatest } = require('./utils');
const Tracking = require('./tracking');

const displayRules = {};

function checkArticleAndLimit(uuid, translator, pubDate) {
	displayRules.translator = translator;

	return new Promise((resolve, reject) => {
		const isLimitReached = LIMITS.withinApiLimit([translator]);
		const hasCachedContent = CACHE.exists(`${uuid}_${translator}`);

		Promise.all([isLimitReached, hasCachedContent])
			.then(async data => {
				if(data[0][translator]) {
					displayRules.displayWidget = true;

					if(data[1] && getLatest(pubDate, data[1].lastPubDate)) {
						displayRules.cacheRef = data[1]['S3_ETag'];
						displayRules.cacheFileName = `${uuid}_${translator}`;
						displayRules.languages = getWidgetLanguages(data[1]);
					} else {
						displayRules.languages = getWidgetLanguages();
					}
				} else {
					if(data[1] && getLatest(pubDate, data[1].lastPubDate)) {
						displayRules.displayWidget = true;
						displayRules.languages = getWidgetLanguages(data[1], true);
						displayRules.cacheRef = data[1]['S3_ETag'];
						displayRules.cacheFileName = `${uuid}_${translator}`;
					} else {
						displayRules.displayWidget = false;	
					}
				}
				resolve(displayRules);
			})
			.catch(err => Tracking.splunk(`error="Error checking display rules" message=${JSON.stringify(err)} uuid=${uuid} translator=${translator}`));
	});
}

function getWidgetLanguages(data, restricted = false) {
	const default_languages =  [
			{code: 'DE', name: 'German'},
			{code: 'FR', name: 'French'},
			{code: 'ES', name: 'Spanish'}
	];

	if(data) {
		const cached = data.langs.values;
		const available_languages = [];

		if(restricted) {
			for(let i = 0; i < cached.length; ++i) {
				const language = default_languages.find(lang => { return lang.code === cached[i].toUpperCase() } );
				if(language !== null  && language !== undefined) {
					language.cached = true;
					available_languages.push(language);
				}
			}
			return available_languages;
			
		} else {
			for (lang in default_languages) {
				const isCached = cached.find(cache => cache.toUpperCase() === default_languages[lang].code);
				default_languages[lang].cached = !!isCached;
			}
		}
		
	}

	return default_languages;
}



module.exports = {
	check: checkArticleAndLimit
};
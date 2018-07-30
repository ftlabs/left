const LIMITS = require('../aws/translation-api-limit');
const CACHE = require('../aws/translation-cache-table');

const displayRules = {};

function checkArticleAndLimit(uuid, translator, pubDate) {
	displayRules.translator = translator;

	return new Promise((resolve, reject) => {
		const isLimitReached = LIMITS.withinApiLimit([translator]);
		const hasCachedContent = CACHE.exists(`${uuid}_${translator}`);

		Promise.all([isLimitReached, hasCachedContent])
			.then(data => {
				if(data[0][translator]) {
					displayRules.displayWidget = true,
					displayRules.languages = getWidgetLanguages();

					if(data[1] && getLatest(pubDate, data[1].lastPubDate)) {
						displayRules.cacheRef = data[1]['S3_ETag'];
					}
				} else {
					if(data[1] && getLatest(pubDate, data[1].lastPubDate)) {
						displayRules.displayWidget = true;
						displayRules.languages = getWidgetLanguages(data[1]);
						displayRules.cacheRef = data[1]['S3_ETag'];
					} else {
						displayRules.displayWidget = false;	
					}
				}
				resolve(displayRules);
			})
			.catch(err => console.log(err));
	});
}

function getWidgetLanguages(data) {
	const default_languages =  [
			{code: 'DE', name: 'German'},
			{code: 'FR', name: 'French'},
			{code: 'ES', name: 'Spanish'}
	];

	if(data) {
		const cached = extractLanguages(data);
		const available_languages = [];

		for(let i = 0; i < cached.length; ++i) {
			available_languages.push(default_languages.find(lang => { return lang.code === cached[i] } ));
		}

		return available_languages;
	}

	return default_languages;
}

function extractLanguages(data) {
	const langs = [];

	for(let key in data) {
		if(key.startsWith('lang_')) {
			if(data[key]) {
				langs.push(key.split('_')[1].toUpperCase());
			}
		}
	}

	console.log('LANGS::', langs);
	return langs;
}

function getLatest(pubDate, cachedPubDate) {
	return Date.parse(cachedPubDate) >= pubDate;
}

module.exports = {
	check: checkArticleAndLimit
};
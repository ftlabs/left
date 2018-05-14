if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const ALLOWED_USERS = process.env.ALLOWED_USERS.split(',');
const PUBLIC_TRANSLATORS = process.env.PUBLIC_TRANSLATORS.split(',');
const RESTRICTED_TRANSLATORS = process.env.RESTRICTED_TRANSLATORS.split(',');
const DEFAULT_LANG = 'French';

function getAllowedTranslators(user) {
	let translators = PUBLIC_TRANSLATORS;

	if(user !== null && ALLOWED_USERS.includes(user)) {
		translators = translators.concat(RESTRICTED_TRANSLATORS);
	}

	return translators;
}

function getAvailableLanguages(languages) {
	const filteredSettings = [];
	const knownTranslators = {};

 	languages.map( language => {
 		const duplicate = filteredSettings.findIndex((element) => {
 			return element.name.toLowerCase() === language.name.toLowerCase();
 		});

		knownTranslators[language.translator] = true;

 		if(duplicate === -1) {
			language.isDefault = (language.name.toLowerCase() === DEFAULT_LANG.toLowerCase());
			language.translatorNames = [language.translator];
 			filteredSettings.push(language);
 		} else {
			filteredSettings[duplicate].translatorNames.push(language.translator);
 		}
 	} );

 	filteredSettings.sort(sortName);

	// embellish the langs with displayable details of their translators
	const numTranslators = Object.keys(knownTranslators).length;

	filteredSettings.map( language => {
		language.translatorNames;
		language.translatorNamesCSV = language.translatorNames.join(',');
		language.translatorNamesInitialsCSV = language.translatorNames.map(name=>{ return name.charAt(0); }).join(',');
		if (numTranslators > 1) {
			language.nameWithTranslators = `${language.name} [${language.translatorNamesInitialsCSV}]`;
		} else {
			language.nameWithTranslators = language.name;
		}
	});

	return filteredSettings;
}

function sortName(a,b) {
	if (a.name < b.name)
		return -1;
	if (a.name > b.name)
		return 1;
	return 0;
}

module.exports = {
	translatorSettings: getAllowedTranslators,
	languages: getAvailableLanguages
}

if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const ALLOWED_USERS = process.env.ALLOWED_USERS.split(',');
const PUBLIC_TRANSLATORS = process.env.PUBLIC_TRANSLATORS.split(',');
const RESTRICTED_TRANSLATORS = process.env.RESTRICTED_TRANSLATORS.split(',');

function getAllowedTranslators(user) {
	let translators = PUBLIC_TRANSLATORS;

	if(user !== null && ALLOWED_USERS.includes(user)) {
		translators = translators.concat(RESTRICTED_TRANSLATORS);
	}

	return translators;
}

function getAvailableLanguages(languages) {
	let flatLang = languages.filter((elem, index, self) => {
        return index === self.indexOf(elem);
    });

	return flatLang;
}

module.exports = {
	translatorSettings: getAllowedTranslators,
	languages: getAvailableLanguages
}
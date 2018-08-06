const AUDIO_RENDER_URL = process.env.AUDIO_RENDER_URL;
const AUDIO_RENDER_TOKEN = process.env.AUDIO_RENDER_TOKEN;
const MAX_CHARS_FOR_AUDIO = 1500;

function getAudio(translations, lang) {
	const originalVoice = 'Amy';
	const originalLang = 'en';
	let translationVoice = originalVoice;
	let translationVoiceLang = originalLang;
	let langLC = lang.toLowerCase();

	if (langLC === 'fr') {
		translationVoice = 'Celine';
		translationVoiceLang = langLC;
	} else if (langLC === 'de') {
		translationVoice = 'Marlene';
		translationVoiceLang = langLC;
	}

	// construct the audio-related info
	translations.translatorNames.map(translatorName => {
		let audioVoice;
		let audioButtonDesc;
		
		if (translatorName === 'original') {
			audioVoice = originalVoice;
			audioButtonDesc = `${originalVoice}(${originalLang}) -> en`;
		} else {
			audioVoice = translationVoice;
			audioButtonDesc = `${translationVoice} (${translationVoiceLang}) -> ${langLC}`;
		}
		const audioBaseUrl = `${AUDIO_RENDER_URL}?voice=${audioVoice}&wrap=no&text=`;
		let audioBody;
		if (translations.texts[translatorName].hasOwnProperty('error')) {
			audioBody = 'Je ne regrette rien';
		} else {
			audioBody = translations.texts[translatorName];
		}
		audioBody = audioBody.slice(0, MAX_CHARS_FOR_AUDIO);

		translations.audioUrls[
			translatorName
		] = `${audioBaseUrl}${encodeURIComponent(audioBody)}`;
		translations.audioButtonText[translatorName] = `AUDIO: ${audioButtonDesc}`;
	});

	return translations;
}


module.exports = {
	get: getAudio
}
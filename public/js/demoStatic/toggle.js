var articleText = document.querySelector('.article-text');
var translationText = document.querySelector('.translation-text');
var translationLoading = document.querySelector('.translation-loading');
var translationExpanded = document.querySelector('.translation-expanded');
var turnOffButton = document.querySelector('.turn-off-button');
var languageSelect = document.querySelector('.language-select');
var translationPrompt = document.querySelector('.translation-prompt');
var accordionButton = document.querySelector('.accordion-button');
var translationError = document.querySelector('.translation-error');

function init() {
	translationText.classList.add('translation-hidden');
}

function httpGet(url, callback, errorCallback) {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState === 4) {
			if (xmlHttp.status === 200) {
				callback(xmlHttp.responseText);
			} else {
				errorCallback();
			}
		}
	};
	xmlHttp.open('GET', url, true);
	xmlHttp.send(null);
}

function toggleTranslationAccordion() {
	translationExpanded.classList.toggle('translation-hidden');

	accordionButton.innerText =
		accordionButton.innerText == 'Hide' ? 'Try it' : 'Hide';

	accordionButton.classList.toggle('o-buttons-icon--arrow-down');
	accordionButton.classList.toggle('o-buttons-icon--arrow-up');
}

function showTranslation(e) {
	var language = e.target.options[1].value;
	// translationError.classList.add('translation-hidden');
	e.preventDefault();
	articleText.classList.add('translation-blur');
	translationLoading.classList.remove('translation-hidden');
	httpGet(
		'../get-translation/37d9219e-73b3-11e8-aa31-31da4279a601/' +
			language.toLowerCase(),
		successfulTranslationRequest,
		unsuccessfulTranslationRequest
	);
}

function unsuccessfulTranslationRequest() {
	console.log('got into error translation');
	articleText.classList.remove('translation-blur');
	translationLoading.classList.add('translation-hidden');
	translationError.classList.remove('translation-hidden');
}

function successfulTranslationRequest(data) {
	translationText.innerHTML = JSON.parse(data).body;
	articleText.classList.add('translation-hidden');
	articleText.classList.remove('translation-blur');
	translationLoading.classList.add('translation-hidden');
	translationText.classList.remove('translation-hidden');
	turnOffButton.classList.remove('translation-hidden');
	toggleTranslationAccordion();
	translationPrompt.innerHTML = 'This article has been translated into French';
	accordionButton.innerText = 'Change';
}

function removeTranslation() {
	articleText.classList.remove('translation-hidden');
	translationText.classList.add('translation-hidden');
	turnOffButton.classList.add('translation-hidden');
	languageSelect.selectedIndex = 0;
	translationPrompt.innerHTML = 'Now you can translate articles on the FT';
}

document
	.querySelector('.language-select')
	.addEventListener('change', showTranslation);

document
	.querySelector('.turn-off-button')
	.addEventListener('click', removeTranslation);

document
	.querySelector('.accordion-button')
	.addEventListener('click', toggleTranslationAccordion);

document.addEventListener('DOMContentLoaded', init);

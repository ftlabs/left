var rootUrl = window.location.href;

var Utils = Origami['o-utils'];

function init() {
	var form = document.getElementById('translateForm');
	var language = document.getElementById('langSelect');
	var toggle = document.querySelector('.o-buttons.settings');

	console.log(language.children.length);
	if(language.children.length > 0) {
		toggleSettings();
		language.addEventListener('change', updateTranslators);
		form.addEventListener('submit', getTranslation);
	} else {
		toggle.classList.add('cape');
		addLimitsWarning();
	}

	if(window.leftByPass === 'true') {
		addLimitsWarning('labs');
	}
}

function updateTranslators(e) {
	var selected = e.currentTarget.options.selectedIndex;
	var translators = e.currentTarget.options[selected]
		.getAttribute('data-translators')
		.split(',');

	var translatorSelection = document.querySelectorAll('#translators input');
	Array.from(translatorSelection).forEach(function(checkbox) {
		checkbox.checked = false;
		checkbox.disabled = true;
	});

	for (var i = 0; i < translators.length; ++i) {
		var translator = document.querySelector('#' + translators[i]);
		translator.checked = true;
		translator.disabled = false;
	}
}

function getTranslation(e) {
	e.preventDefault();

	var uuidElement = e.target.querySelector('#articleUUID');
	var freeTextElement = e.target.querySelector('#freeText');
	var lexiconElement = e.target.querySelector('#lexiconTerm');

	var uuidMatch = /^([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})/g;
	var language = e.target.querySelector('#langSelect');
	var isFreeText = false;

	var fetchOptions = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'POST',
		credentials: 'same-origin'
	};

	let whichInput = null;
	if (lexiconElement.value !== '') {
		whichInput = 'lexicon';
	} else if (freeTextElement.value !== '') {
		whichInput = 'freeText';
	} else if (uuidElement.value !== '') {
		whichInput = 'uuid';
		if (!uuidMatch.test(uuidElement.value)) {
			alert('Invalid UUID');
			return;
		}
	} else {
		alert(
			'Specify something to translate, be it a UUID, free text, or a lexicon term.'
		);
		return;
	}

	if (language.value === '') {
		alert('Select a language into which to translate.');
		return;
	}

	var translatorOptions = document.querySelectorAll(
		'#translators input:checked'
	);
	var translatorSelection = [];

	Array.from(translatorOptions).forEach(function(checkbox) {
		translatorSelection.push(checkbox.value);
	});

	if (translatorSelection.length < 1) {
		alert('You must select at least one translation service');
		return;
	}

	toggleLoadingState();

	if (whichInput == 'lexicon') {
		fetchOptions.body = 'text=' + lexiconElement.value +'&translators=' + JSON.stringify(translatorSelection) +'&from=en';

		return fetch(rootUrl + 'lexicon/' + language.value, fetchOptions)
			.then(res => res.json())
			.then(data => {
				toggleSettings();
				displayText(data);
			})
			.catch(err => console.log(err));
	} else if (whichInput == 'freeText') {
		fetchOptions.body = 'text=' + freeTextElement.value +'&translators=' + JSON.stringify(translatorSelection);

		return fetch(rootUrl + 'translation/' + language.value, fetchOptions)
			.then(res => res.json())
			.then(data => {
				toggleSettings();
				displayText(data);
			})
			.catch(err => console.log(err));
	} else if (whichInput == 'uuid') {
		fetchOptions.body = 'translators=' + JSON.stringify(translatorSelection) + '&from=en';

		fetch(
			rootUrl + 'article/' + uuidElement.value + '/' + language.value,
			fetchOptions
		)
			.then(res => res.json())
			.then(data => {
				toggleSettings();
				displayText(data);
			})
			.catch(err => console.log(err));
	}
}

function displayText(data) {
	var container = document.getElementById('output');
	container.innerHTML = '';

	for (var i = 0; i < data.translatorNames.length; ++i) {
		var output = document.createElement('div');
		const sourceName = data.translatorNames[i];
		const sourceData = data.texts[sourceName];
		output.setAttribute('id', sourceName);
		var title = document.createElement('h2');
		if (i === 0 && data.article) {
			title.innerHTML =
				sourceName +
				' <a href="https://ft.com/content/' +
				data.article +
				'" target="_blank" class="ft-link"><img src="https://www.ft.com/__origami/service/image/v2/images/raw/fticon-v1:outside-page?format=svg&source=ftlabs&tint=%23990F3D" /></a>';
		} else {
			title.textContent = sourceName;
		}
		var bodyText = document.createElement('div');
		bodyText.classList.add('text-body');
		if (sourceData['error']) {
			bodyText.classList.add('is-error');
			bodyText.textContent = sourceData['error'];
		} else {
			bodyText.innerHTML = sourceData;
		}
		const audioUrl = data.audioUrls[sourceName];
		const audioButtonText = data.audioButtonText[sourceName];
		const audioUrlElt = document.createElement('div');
		audioUrlElt.innerHTML = `<a href="${audioUrl}" target="_blank" class="o-buttons o-buttons--mono">${audioButtonText}</a>`;

		output.appendChild(title);
		output.appendChild(bodyText);
		output.appendChild(audioUrlElt);

		container.appendChild(output);
	}

	setChildrenDataAttributes();

	toggleLoadingState();


	document.getElementById('output').classList.remove('cape');

	formatChildElements();
}

function formatChildElements() {
	setElementsHeight();
	window.addEventListener('resize', Utils.debounce(setElementsHeight, 250));
}

function setElementsHeight() {
	var textBody = document.getElementsByClassName('text-body');
	resetElementHeight(textBody);

	for (let i = 0; i < textBody[0].children.length; i++) {
		let largest;
		applyToAllElements(i, element => {
			if (!largest || largest.offsetHeight < element.offsetHeight) {
				largest = element;
			}
		});

		applyToAllElements(i, element => {
			element.setAttribute(
				'style',
				'min-height:' + largest.offsetHeight + 'px'
			);
		});
	}
}

function resetElementHeight(parentElement) {
	Array.from(parentElement).forEach(element =>
		Array.from(element.children).forEach((element, index) => {
			element.setAttribute('style', '');
		})
	);
}

function setChildrenDataAttributes() {
	var textBody = document.getElementsByClassName('text-body');

	Array.from(textBody).forEach(element =>
		Array.from(element.children).forEach((element, index) => {
			element.setAttribute('data-element-number', index);
		})
	);
}

function applyToAllElements(index, func) {
	var elements = document.querySelectorAll(
		'[data-element-number="' + index + '"]'
	);
	Array.from(elements).forEach(func);
}

function toggleSettings() {
	var toggle = document.querySelector('.o-buttons-icon--arrow-down');
	toggle.click();
}

function toggleLoadingState(form) {
	var form = document.getElementById('translateForm');
	var submit = document.querySelector('.o-buttons--primary');
	submit.getAttribute('disabled')
		? submit.removeAttribute('disabled')
		: submit.setAttribute('disabled', 'disabled');

	form.classList.toggle('loading');

	var loader = document.querySelector('.loading-card');
	var invertVisibility =
		loader.getAttribute('aria-hidden') === 'true' ? false : true;
	loader.setAttribute('aria-hidden', invertVisibility);
	loader.classList.toggle('cape');
}

function addLimitsWarning(user = 'user') {
	var errorMessage = 'The monthly quota for translations has been reached. Please wait until next month or contact #ftlabs for a demo';

	if(user === 'labs') {
		errorMessage = 'The monthly limit is reached for ' + window.leftLimits;
	}

	var msgContainer = document.querySelector('.o-message')
	var msg = document.querySelector('.o-message__content-main');
	msg.textContent = errorMessage;

	msgContainer.classList.remove('cape');
}

document.addEventListener('DOMContentLoaded', init);

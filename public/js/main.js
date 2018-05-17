var rootUrl = window.location.href;

function init() {
	toggleSettings();
	var form = document.getElementById('translateForm');
	var language = document.getElementById('langSelect');

	language.addEventListener('change', updateTranslators);
	form.addEventListener('submit', getTranslation);
}

function updateTranslators(e) {
	var selected = e.currentTarget.options.selectedIndex;
	var translators = e.currentTarget.options[selected].getAttribute('data-translators').split(',');

	var translatorSelection = document.querySelectorAll('#translators input');
	Array.from(translatorSelection).forEach(function(checkbox) {
		checkbox.checked = false;
		checkbox.disabled = true;
	});

	for(var i = 0; i < translators.length; ++i) {
		var translator = document.querySelector('#' + translators[i]);
		translator.checked = true;
		translator.disabled = false;
	}
}

function getTranslation(e) {
	e.preventDefault();

	var uuidElement     = e.target.querySelector('#articleUUID');
	var freeTextElement = e.target.querySelector('#freeText');
	var lexiconElement  = e.target.querySelector('#lexiconTerm');

	var uuidMatch = /^([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})/g;
	var language = e.target.querySelector('#langSelect');
	var isFreeText = false;

	var fetchOptions = {
		headers: {
			'Content-Type': 'application/json'
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
		if(!uuidMatch.test(uuidElement.value)) {
			alert('Invalid UUID');
			return;
		}
	} else {
		alert('Specify something to translate, be it a UUID, free text, or a lexicon term.');
		return;
	}

	if(language.value === '') {
		alert('Select a language into which to translate.');
		return;
	}

	var translatorOptions = document.querySelectorAll('#translators input:checked');
	var translatorSelection = [];

	Array.from(translatorOptions).forEach(function(checkbox) {
		translatorSelection.push(checkbox.value);
	});

	if(translatorSelection.length < 1) {
		alert('You must select at least one translation service');
		return;
	}

	toggleLoadingState();

	if(whichInput == 'lexicon') {
		fetchOptions.body = JSON.stringify({ text: lexiconElement.value, translators: translatorSelection });

		return fetch(rootUrl + 'lexicon/' + language.value, fetchOptions)
			.then(res => res.json())
			.then(data => {
				toggleSettings();
				displayText(data);
			})
			.catch(err => console.log(err));

	} else if(whichInput == 'freeText') {
		fetchOptions.body = JSON.stringify({ text: freeTextElement.value, translators: translatorSelection });

		return fetch(rootUrl + 'translation/' + language.value, fetchOptions)
			.then(res => res.json())
			.then(data => {
				toggleSettings();
				displayText(data);
			})
			.catch(err => console.log(err));

	} else if (whichInput == 'uuid') {
		fetchOptions.body = JSON.stringify({translators: translatorSelection });

		fetch(rootUrl + 'article/' + uuidElement.value +'/' + language.value, fetchOptions)
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

	for(var i = 0; i < data.outputs.length; ++i) {
		var output = document.createElement('div');
		const sourceName = data.outputs[i];
		const sourceData = data[sourceName];
		output.setAttribute('id', sourceName);
		var title = document.createElement('h2');
		if(i === 0 && data.article) {
			title.innerHTML = sourceName + ' <a href="https://ft.com/content/' + data.article + '" target="_blank" class="ft-link"><img src="https://www.ft.com/__origami/service/image/v2/images/raw/fticon-v1:outside-page?format=svg&source=ftlabs&tint=%23990F3D" /></a>';
		} else {
			title.textContent = sourceName;
		}
		var bodyText = document.createElement('div');
		bodyText.classList.add('text-body');
		if(sourceData['error']) {
			bodyText.classList.add('is-error');
			bodyText.textContent = sourceData['error'];
		} else {
			bodyText.innerHTML = sourceData;
		}

		output.appendChild(title);
		output.appendChild(bodyText);

		container.appendChild(output);
	}

	toggleLoadingState();

	document.getElementById('output').classList.remove('cape');
}

function toggleSettings() {
	var toggle = document.querySelector('.o-buttons-icon--arrow-down');
	toggle.click();
}

function toggleLoadingState(form) {
	var form = document.getElementById('translateForm');
	var submit = document.querySelector('.o-buttons--primary');
	submit.getAttribute('disabled') ? submit.removeAttribute('disabled') : submit.setAttribute('disabled', 'disabled');


	form.classList.toggle('loading');

	var loader = document.querySelector('.loading-card');
	var invertVisibility = (loader.getAttribute('aria-hidden') === "true")? false : true;
	loader.setAttribute('aria-hidden', invertVisibility);
	loader.classList.toggle('cape');

}

document.addEventListener('DOMContentLoaded', init);

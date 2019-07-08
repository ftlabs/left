var translator;
var Overlay = Origami['o-overlay'];
var toggleButton = document.querySelector('.ftlabs-translation__toggle');
var articleTitle = document.querySelector('h1.topper__headline span:first-child');
var articleStandfirst = document.querySelector('.topper__standfirst');
var articleText = document.querySelectorAll('.article__content-body > p');
var translationLoading = document.querySelector('.ftlabs-translation--loading');
var translationCollapsed = document.querySelector(
	'.ftlabs-translation__accordion--collapsed'
);
var translationExpanded = document.querySelector(
	'.ftlabs-translation__accordion--expanded'
);
var turnOffButton = document.querySelector('.ftlabs-translation__button--off');
var translateAll = document.querySelector(
	'.ftlabs-translation__tickbox input[type="checkbox"]'
);
var translationPrompt = document.querySelector('.ftlabs-translation__prompt');
var accordionButton = document.querySelector('.ftlabs-translation__toggle');
var translationError = document.querySelector('.ftlabs-translation--error');
var disclaimer = document.querySelector('.ftlabs-translation__disclaimer');
var articleId = document
	.querySelector('article')
	.getAttribute('data-content-id');
var pubDate = document
	.querySelector('.article-info__time-byline time')
	.getAttribute('datetime');
var localTranslations = {};
var overlayShowCount = 0;

function init(langs) {
	var languageSelect = document.createElement('ul');
	languageSelect.classList.add('ftlabs-translation__language-selection');

	//TODO: change languages into radio buttons
	for (let i = 0; i < langs.length; ++i) {
		var listItem = document.createElement('li');
		var elementDiv = document.createElement('div');
		elementDiv.classList.add(
			'ftlabs-translation__language-selection-element'
		);

		elementDiv.classList.add(
			'ftlabs-translation__language-selection-' + langs[i].name
		);

		elementDiv.setAttribute('data-lang-code', langs[i].code);

		listItem.appendChild(elementDiv);
		var tickDiv = document.createElement('div');
		tickDiv.classList.add('ftlabs-translation__tick-circle');
		elementDiv.appendChild(tickDiv);
		var tickElement = document.createElement('img');
		tickElement.setAttribute(
			'src',
			'https://www.ft.com/__origami/service/image/v2/images/raw/fticon-v1:tick?source=ftlabs'
		);
		tickDiv.appendChild(tickElement);
		var imageElement = document.createElement('img');
		imageElement.setAttribute(
			'src',
			'https://www.ft.com/__origami/service/image/v2/images/raw/ftflag-v1:' +
				langs[i].code +
				'?source=ftlabs'
		);
		imageElement.setAttribute('alt', langs[i].name + ' flag');
		imageElement.classList.add('ftlabs-translation__flag');
		elementDiv.appendChild(imageElement);
		var languageName = document.createElement('span');
		languageName.innerHTML = langs[i].name;
		elementDiv.appendChild(languageName);
		listItem.addEventListener('click', function() {
			// greyOutOtherElements;
			showTranslation(langs[i]);
		});
		languageSelect.appendChild(listItem);
	}

	document.addEventListener('oOverlay.ready', function() {
		if(overlayShowCount === 0) {
			var form = Overlay.getOverlays().overlay.content;
			form.insertBefore(languageSelect, form.firstChild);

			setOverlayListeners();
			++overlayShowCount;
		}
	});


	//TODO: come back to this!
	// var translateSetting = window.localStorage.getItem('FT.translateAll');
	// if (translateSetting !== null) {
	// 	translateAll.checked = true;
	// 	languageSelect.value = translateSetting;

	// 	if (!!languageSelect.value) {
	// 		logComponentInteractions(
	// 			'automatic-translation',
	// 			languageSelect.value
	// 		);
	// 		languageSelect.dispatchEvent(new Event('change'));
	// 	} else {
	// 		languageSelect.selectedIndex = 0;
	// 	}
	// }
	// translateAll.addEventListener('change', toggleTranslateAll);
}

function greyOutOtherElements() {}

function toggleTranslationAccordion() {
	translationExpanded.classList.toggle('ftlabs-translation--hidden');
	accordionButton.innerText = getAccordionCTA();

	var state = translationExpanded.classList.contains(
		'ftlabs-translation--hidden'
	)
		? 'collapsed'
		: 'expanded';
	logComponentInteractions(`translation-${state}`, languageSelect.value);

	accordionButton.classList.toggle('o-buttons-icon--arrow-down');
	accordionButton.classList.toggle('o-buttons-icon--arrow-up');
}

function toggleTranslateAll(e) {
	if (e.currentTarget.checked) {
		window.localStorage.setItem('FT.translateAll', languageSelect.value);
		logComponentInteractions('translateAll-enabled', languageSelect.value);
	} else {
		window.localStorage.removeItem('FT.translateAll');
		logComponentInteractions('translateAll-disabled');
	}
}

function showTranslation(language) {
	//TODO: unless the latest chosen is single column!
	showTranslationSplitView();

	var languageCode = language.code;
	var language = language.name;
	var fromCache;

	var translateSetting = window.localStorage.getItem('FT.translateAll');
	if (translateSetting !== null) {
		window.localStorage.setItem('FT.translateAll', languageCode);
	}

	var fetchOptions = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'POST',
		body: `translators=${JSON.stringify([translator])}&from=en`
	};

	if (localTranslations[`${languageCode.toLowerCase()}`]) {
		logComponentInteractions('translation-from-local', languageCode);
		return successfulTranslationRequest(
			localTranslations[`${languageCode.toLowerCase()}`],
			language
		);
	} else if (fromCache === 'true') {
		logComponentInteractions('translation-from-cache', languageCode);
		fetchOptions.body += '&fromCache=true';
	
	}

	fetch(
		`https://ftlabs-left.herokuapp.com/article/${articleId}/${languageCode.toLowerCase()}`,
		fetchOptions
	)
		.then(function(res){
			return  res.json();
		})
		.then(function(data) {
			var translationOptions = document.querySelector('.ftlabs-translation-options');
			translationOptions.classList.remove('ftlabs-translation--hidden');

			var selector;
			localTranslations = {};
			logComponentInteractions(
				'translation-successful',
				languageCode
			);

			if (fromCache === 'true') {
				localTranslations = JSON.parse(data);
				selector = JSON.parse(data)[
					`${languageCode.toLowerCase()}`
				];
			} else {
				selector = data.texts[translator];
				localTranslations[
					`${languageCode.toLowerCase()}`
				] = selector;
			}
			successfulTranslationRequest(selector, language);
			Overlay.getOverlays().overlay.close();
			return;

		})
		.catch((err) => {
			console.error(err);
			unsuccessfulTranslationRequest(JSON.stringify(err));
		});
}

function unsuccessfulTranslationRequest(err) {
	// translationCollapsed.classList.remove('ftlabs-translation--blur');
	// translationExpanded.classList.remove('ftlabs-translation--blur');
	// translationLoading.classList.add('ftlabs-translation--hidden');
	translationError.classList.remove('ftlabs-translation--hidden');
	logComponentInteractions('translation-error', languageSelect.value, err);
}

function successfulTranslationRequest(selector, language) {
	var translation = document.createElement('div');
	translation.innerHTML = selector.trim();

	var translationTitle = translation.querySelector('h1');
	if (!articleTitle.hasAttribute('data-original')) {
		articleTitle.setAttribute(
			'data-original',
			articleTitle.textContent
		);
	}
	articleTitle.textContent = translationTitle.textContent;

	if (articleStandfirst.textContent.length > 0) {
		var translationStandfirst = translation.querySelector('h2');
		if (!articleStandfirst.hasAttribute('data-original')) {
			articleStandfirst.setAttribute(
				'data-original',
				articleStandfirst.innerHTML
			);
		}

		if (translationStandfirst !== null) {
			articleStandfirst.innerHTML = translationStandfirst.innerHTML;
		}
	}

	var translationArray = translation.querySelectorAll('p');

	Array.from(articleText).forEach((paragraph, index) => {
		if (!paragraph.hasAttribute('data-original')) {
			paragraph.setAttribute('data-original', paragraph.innerHTML);
		}
		paragraph.innerHTML = translationArray[index].innerHTML;
	});

	showSplitView();

	// translationCollapsed.classList.remove('ftlabs-translation--blur');
	// translationExpanded.classList.remove('ftlabs-translation--blur');
	// translationLoading.classList.add('ftlabs-translation--hidden');
	// turnOffButton.classList.remove('ftlabs-translation--hidden');

	// translationPrompt.innerHTML =
	// 	'This article has been translated into ' + language;
}

function removeTranslation() {
	logComponentInteractions('translation-off');

	removeTranslationSplitView();
	toggleTranslationAccordion();

	articleTitle.textContent = articleTitle.getAttribute('data-original');

	if (articleStandfirst.textContent.length > 0) {
		articleStandfirst.innerHTML = articleTitle.getAttribute(
			'data-original'
		);
	}

	Array.from(articleText).forEach((paragraph) => {
		paragraph.innerHTML = paragraph.getAttribute('data-original');
	});

	turnOffButton.classList.add('ftlabs-translation--hidden');
	languageSelect.selectedIndex = 0;
	translationPrompt.innerHTML =
		'Automated translations are now available for <a href="https://www.ft.com/brexit" class="n-content-tag">Brexit</a> and <a href="https://www.ft.com/companies/technology" class="n-content-tag">Technology</a> articles on the FT';
	accordionButton.innerText = getAccordionCTA();
}

function logComponentInteractions(interaction, language = 'EN', error = null) {
	// document.body.dispatchEvent(
	//     new CustomEvent('oTracking.event', {
	//         detail: {
	//             action: interaction,
	//             category: 'ftlabs-translations',
	//             contentID: articleId,
	//             language: language,
	//             error: error
	//         },
	//         bubbles: true
	//     })
	// );
}

function getAccordionCTA() {
	var cta;

	if (translationExpanded.classList.contains('ftlabs-translation--hidden')) {
		if (languageSelect.selectedIndex !== 0) {
			cta = 'Change';
			disclaimer.classList.remove('ftlabs-translation--hidden');
		} else {
			cta = 'Try it';
			disclaimer.classList.add('ftlabs-translation--hidden');
		}
	} else {
		cta = 'Hide';
		disclaimer.classList.remove('ftlabs-translation--hidden');
	}

	return cta;
}

function getTranslationData(e) {
	fetch(`https://ftlabs-left.herokuapp.com/check/${articleId}/${pubDate}`)
		.then((res) => res.json())
		.then((data) => {
			if (data.displayWidget) {
				translator = data.translator;
				init(data.languages);
			} else {
				logComponentInteractions('no-display');
			}
		})
		.catch((err) => {
			logComponentInteractions(
				'display-check-error',
				'EN',
				JSON.stringify(err)
			);
		});
}

document.addEventListener('DOMContentLoaded', getTranslationData);

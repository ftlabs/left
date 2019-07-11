var translator;
var Overlay = Origami['o-overlay'];
var toggleButton = document.querySelector('.ftlabs-translation__toggle');
var articleTitle = document.querySelector(
	'h1.topper__headline span:first-child'
);
var articleStandfirst = document.querySelector('.topper__standfirst');
var articleText = document.querySelectorAll('.article__content-body > p');

var turnOffButton = document.querySelector('.ftlabs-translation__button--off');

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
	try {
		var languageSelect = document.createElement('div');
		languageSelect.classList.add('o-forms__group');
		languageSelect.classList.add('ftlabs-language-options-selection');

		for (let i = 0; i < langs.length; ++i) {
			var listItem = document.createElement('input');
			listItem.type = 'radio';
			listItem.name = 'language-flag';

			var elementDiv = document.createElement('div');
			elementDiv.classList.add('o-forms__group');
			elementDiv.classList.add('o-forms__group--inline');
			elementDiv.classList.add(
				'ftlabs-translation__language-selection-element'
			);
			elementDiv.setAttribute('data-lang-code', langs[i].code);

			listItem.value = langs[i].code;
			listItem.classList.add('o-forms__radio');
			listItem.setAttribute('id', 'language' + langs[i].code);

			elementDiv.appendChild(listItem);

			var languageName = document.createElement('label');
			languageName.innerHTML = langs[i].name;
			languageName.setAttribute('for', 'language' + langs[i].code);
			languageName.classList.add('o-forms__label');

			elementDiv.appendChild(languageName);

			listItem.addEventListener('change', function(e) {
				if (e.currentTarget.checked) {
					showTranslation(langs[i]);
				}
			});
			languageSelect.appendChild(elementDiv);
		}

		document.addEventListener('oOverlay.ready', function() {
			if (overlayShowCount === 0) {
				var form = Overlay.getOverlays().overlay.content;
				form = form.querySelector('form');
				form.insertBefore(languageSelect, form.firstChild);
				var translateAll = form.querySelector(
					'.ftlabs-translation__tickbox input[type="checkbox"]'
				);

				translateAll.addEventListener('change', toggleTranslateAll);

				var translateSetting = window.localStorage.getItem(
					'FT.translateAll'
				);

				if (translateSetting !== null) {
					translateAll.checked = true;
					var languageSelection = document.querySelector(
						'#language' + translateSetting
					);
					languageSelection.checked = true;
				}
				setOverlayListeners();
				++overlayShowCount;
			}
		});

		// var overlay = Overlay.getOverlays().overlay.content;
		// var translateAll = overlay.querySelector(
		// 	'.ftlabs-translation__tickbox input[type="checkbox"]'
		// );
		var translateSetting = window.localStorage.getItem('FT.translateAll');

		if (translateSetting !== null) {
			// translateAll.checked = true;

			// var languageSelect = overlay.querySelector(
			// 	'#language' + translateSetting
			// );
			// languageSelect.checked = true;

			var languageIndex = langs.findIndex(function(item) {
				return item.code === translateSetting;
			});

			if (languageIndex !== -1) {
				logComponentInteractions(
					'automatic-translation',
					translateSetting
				);

				Overlay.getOverlays().overlay.open();
				setTimeout(function() {
					showTranslation(langs[languageIndex]);
				}, 500);
			}
		}
	} catch (err) {
		console.error(err);
	}
}

function scrollToTop() {
	window.scrollTo(0, 0);
}

function greyOutOtherElements(languageCode) {
	var languageSelection = document.querySelector(
		'.ftlabs-language-options-selection'
	);

	Array.from(languageSelection.children).forEach(function(element) {
		if (element.getAttribute('data-lang-code') === languageCode) {
			Array.from(element.children[0].children).forEach(function(element) {
				console.log('hello', element);
			});
			element.classList.remove('ftlabs-translation__grayout');
		} else {
			element.classList.add('ftlabs-translation__grayout');
		}
	});
}

function toggleTranslateAll(e) {
	var overlay = Overlay.getOverlays().overlay.content;
	var languageSelect = overlay.querySelector('input[type="radio"]:checked');

	if (e.currentTarget.checked) {
		window.localStorage.setItem('FT.translateAll', languageSelect.value);
		logComponentInteractions('translateAll-enabled', languageSelect.value);
	} else {
		window.localStorage.removeItem('FT.translateAll');
		logComponentInteractions('translateAll-disabled');
	}
}

function showTranslation(language) {
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
		.then(function(res) {
			return res.json();
		})
		.then(function(data) {
			greyOutOtherElements(languageCode);
			scrollToTop();
			changeShareBarLanguageCode(languageCode);

			var translationOptions = document.querySelector(
				'.ftlabs-translation-options'
			);
			translationOptions.classList.remove('ftlabs-translation--hidden');

			var selector;
			localTranslations = {};
			logComponentInteractions('translation-successful', languageCode);

			if (fromCache === 'true') {
				localTranslations = JSON.parse(data);
				selector = JSON.parse(data)[`${languageCode.toLowerCase()}`];
			} else {
				selector = data.texts[translator];
				localTranslations[`${languageCode.toLowerCase()}`] = selector;
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
	translationError.classList.remove('ftlabs-translation--hidden');
	logComponentInteractions('translation-error', languageSelect.value, err);
}

function successfulTranslationRequest(selector, language) {
	var translation = document.createElement('div');
	translation.innerHTML = selector.trim();

	var translationTitle = translation.querySelector('h1');
	if (!articleTitle.hasAttribute('data-original')) {
		articleTitle.setAttribute('data-original', articleTitle.textContent);
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
}

function changeShareBarLanguageCode(code) {
	var shareBarLanguage = document.querySelector(
		'.ftlabs-translation__share-bar-langauge'
	);
	shareBarLanguage.innerHTML = code;
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

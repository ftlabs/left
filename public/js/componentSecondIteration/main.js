var translator;
var Overlay = Origami['o-overlay'];
var toggleButton = document.querySelector('.ftlabs-translation__toggle');
var articleTitle = document.querySelector('h1.topper__headline span');
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

function init(langs) {
	var content = Origami['o-overlay'].getOverlays().overlay.content;
	var contendChildren = Array.from(Array.from(content.children)[0].children);
	var languageSelect = contendChildren.find(function(element) {
		if (element.classList !== undefined) {
			return Array.from(element.classList).includes(
				'ftlabs-translation__language-selection'
			);
		}
		return false;
	});
	if (Array.from(languageSelect.children).length === 0) {
		for (let i = 0; i < langs.length; ++i) {
			var listItem = document.createElement('li');
			listItem.classList.add(
				'ftlabs-translation__language-selection-' + langs[i].name
			);
			var elementDiv = document.createElement('div');
			elementDiv.classList.add(
				'ftlabs-translation__language-selection-element'
			);
			listItem.appendChild(elementDiv);
			var tickDiv = document.createElement('div');
			tickDiv.classList.add('ftlabs-translation__tick-circle');
			tickDiv.classList.add('ftlabs-translation--hidden');
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
				greyOutOtherElements(langs[i].name);
				showTranslation(langs[i]);
			});
			languageSelect.appendChild(listItem);
		}
	}

	initSplitView();

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

function greyOutOtherElements(language) {
	var languageSelection = document.querySelectorAll(
		'.ftlabs-translation__language-selection'
	)[1];

	Array.from(languageSelection.children).forEach(function(element) {
		if (
			Array.from(element.classList).includes(
				'ftlabs-translation__language-selection-' + language
			)
		) {
			Array.from(element.children[0].children).forEach(function(element) {
				console.log('1', element);
				if (
					Array.from(element.classList).includes(
						'ftlabs-translation__tick-circle'
					)
				) {
					console.log('getting in here');
					element.classList.remove('ftlabs-translation--hidden');
				}
			});
		} else {
			element.classList.add('ftlabs-translation__grayout');
		}
	});
}

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
	try {
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
			.then((res) => res.json())
			.then((data) => {
				try {
					const translationOptions = document.querySelectorAll(
						'.ftlabs-translation-options'
					)[1];
					console.log('translationOptions', translationOptions);
					translationOptions.classList.remove(
						'ftlabs-translation--hidden'
					);
					Overlay.getOverlays().overlay.close();
					console.log('getting into here');
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
				} catch (err) {
					console.log(err);
				}
			})
			.catch((err) => {
				console.error(err);
				unsuccessfulTranslationRequest(JSON.stringify(err));
			});
	} catch (err) {
		console.error(err);
	}
}

function unsuccessfulTranslationRequest(err) {
	translationCollapsed.classList.remove('ftlabs-translation--blur');
	translationExpanded.classList.remove('ftlabs-translation--blur');
	translationLoading.classList.add('ftlabs-translation--hidden');
	translationError.classList.remove('ftlabs-translation--hidden');
	logComponentInteractions('translation-error', languageSelect.value, err);
}

function successfulTranslationRequest(selector, language) {
	try {
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
	} catch (err) {
		console.error(err);
	}
}

function removeTranslation() {
	logComponentInteractions('translation-off');

	removeTranslationSplitView();
	toggleTranslationAccordion();

	var articleTitle = document.querySelector('h1.topper__headline span');

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

function opentTranslation() {
	var overlay = document.querySelector('#overlay');
	overlay.setAttribute('class', '');
	var content = Origami['o-overlay'].getOverlays().overlay.content;
	var contendChildren = Array.from(Array.from(content.children)[0].children);
	var languageSelect = contendChildren.find(function(element) {
		if (element.classList !== undefined) {
			return Array.from(element.classList).includes(
				'ftlabs-translation__language-selection'
			);
		}
		return false;
	});

	if (Array.from(languageSelect.children).length === 0) {
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
}

document.addEventListener('oOverlay.ready', opentTranslation);

function showSplitView() {
	if (splitStyleAction('get') === (null || 'null')) {
		splitStyleAction('set', 'standard');
	}

	var splitViewOptions = document.querySelector(
		'.ftlabs-translation-options'
	);
	Array.from(splitViewOptions.children).forEach((element) => {
		if (
			element.nodeName === 'INPUT' &&
			element.value === splitStyleAction('get')
		) {
			element.checked = true;
			mobileSplitViewChange(element.value, splitStyleAction('get'));
		}
	});

	splitViewOptions.classList.remove('ftlabs-translation--hidden');

	if (splitStyleAction('get') !== 'standard') {
		splitView();
	}
}

function splitView() {
	var articleBody = document.querySelector('.article__content-body');
	var originalBody = articleBody.cloneNode(true);
	var translatedArticleBody = Array.from(articleBody.children);
	var originalArticleBody = Array.from(originalBody.children);
	headline();
	standFirst();
	removeChildren(articleBody);
	var originalTranslation = createOriginalParagraphs(originalArticleBody);
	populateArticleBody(
		articleBody,
		originalTranslation,
		translatedArticleBody
	);
	articleBody.classList.add('ftlabs-translation--split-view-container');
	mobileSplitViewChange(splitStyleAction('get'), splitStyleAction('get'));
}

function headline() {
	var headline = document.querySelector('.topper__headline');

	var headlineBody = Array.from(headline.children);

	headline.classList.add('ftlabs-translation--split-view');
	headlineBody.forEach((element) => {
		var translated = element.cloneNode(true);
		translated.classList.add('ftlabs-translation__cell');
		element.classList.add('ftlabs-translation__cell');

		var original = element.attributes['data-original'].value;
		element.removeAttribute('data-original');
		element.innerHTML = original;
		headline.appendChild(translated);
	});
	headline.classList.add(
		'ftlabs-translation--split-view-style__' + splitStyleAction('get')
	);
}

function standFirst() {
	var standFirst = document.querySelector('.topper__standfirst');
	var translatedText = standFirst.innerHTML;
	var originalText = standFirst.attributes['data-original'].value;
	standFirst.innerHTML = '';
	standFirst.removeAttribute('data-original');

	var original = standFirst.cloneNode(true);
	original.innerHTML = originalText;

	original.classList.add('ftlabs-translation__cell');

	var translated = standFirst.cloneNode(true);
	translated.setAttribute('data-original', originalText);
	translated.innerHTML = translatedText;
	translated.classList.add('ftlabs-translation__cell');

	standFirst.appendChild(original);
	standFirst.appendChild(translated);
	standFirst.classList.add('ftlabs-translation--split-view');
	standFirst.classList.add(
		'ftlabs-translation--split-view-style__' + splitStyleAction('get')
	);
}

function removeTranslationSplitView() {
	var splitViewOptions = document.querySelector(
		'.ftlabs-translation-options'
	);
	splitViewOptions.classList.add('ftlabs-translation--hidden');
	if (splitStyleAction('get') !== 'standard') {
		removeSplitView();
	}
}

function showTranslationSplitView() {
	var articleBody = document.querySelector('.article__content-body');

	if (
		Array.from(articleBody.classList).includes(
			'ftlabs-translation--split-view-container'
		)
	) {
		removeSplitView();
	}
}

function removeSplitView() {
	try {
		var articleBody = document.querySelector('.article__content-body');
		articleBody.classList.remove(
			'ftlabs-translation--split-view-container'
		);
		var originalArticleBody = restoreOriginalArticleBody(articleBody);

		removeChildren(articleBody);

		originalArticleBody.forEach((element) => {
			articleBody.appendChild(element);
		});

		removeHeadline();
		removeStandfirst();
	} catch (err) {
		console.log(err);
	}
}

function removeHeadline() {
	var headline = document.querySelector('.topper__headline');
	var headlines = Array.from(headline.children);

	headlines.forEach((element) => {
		element.classList.remove('ftlabs-translation__cell');
		if (!element.attributes['data-original']) {
			headline.removeChild(element);
		}
	});

	headline.classList.remove('ftlabs-translation--split-view');
}

function removeStandfirst() {
	var standFirst = document.querySelector('.topper__standfirst');
	var standFirstChildren = Array.from(standFirst.children);
	var originalParagraph = standFirstChildren.find((element) => {
		element.classList.remove('ftlabs-translation__cell');
		return element.attributes['data-original'];
	});
	removeChildren(standFirst);
	standFirst.setAttribute(
		'data-original',
		originalParagraph.attributes['data-original'].value
	);
	standFirst.innerHTML = originalParagraph.innerHTML;
	standFirst.classList.remove('ftlabs-translation--split-view');
}

function createOriginalParagraphs(originalArticleBody) {
	return Array.from(originalArticleBody).map((element) => {
		if (element.tagName === 'P') {
			var original = element.attributes['data-original'].value;
			element.removeAttribute('data-original');
			element.innerHTML = original;
		}
		element.setAttribute('data-split', '0');
		return element;
	});
}

function removeChildren(htmlNode) {
	while (htmlNode.firstChild) {
		htmlNode.removeChild(htmlNode.firstChild);
	}
}

function restoreOriginalArticleBody(articleBody) {
	var originalArticleBody = [];
	Array.from(articleBody.children).forEach((element) => {
		if (element.getAttribute('data-split-container')) {
			Array.from(element.children).forEach((element) => {
				if (!element.attributes['data-split']) {
					originalArticleBody.push(element);
				}
				element.classList.remove('ftlabs-translation__cell');
			});
		} else {
			Array.from(element.children).forEach((element) => {
				originalArticleBody.push(element);
			});
		}
	});
	return originalArticleBody;
}

function populateArticleBody(
	articleBody,
	originalTranslation,
	translatedArticleBody
) {
	var currentDiv = document.createElement('div');
	articleBody.appendChild(currentDiv);
	currentDiv.classList.add('ftlabs-translation--split-view');
	currentDiv.setAttribute('data-split-container', '0');
	originalTranslation.forEach((element, index) => {
		if (
			element.tagName === 'P' ||
			element.tagName === 'UL' ||
			element.tagName === 'H2'
		) {
			element.classList.add('ftlabs-translation__cell');
			translatedArticleBody[index].classList.add(
				'ftlabs-translation__cell'
			);
			currentDiv.appendChild(element);
			currentDiv.appendChild(translatedArticleBody[index]);
		} else {
			currentDiv = document.createElement('div');
			articleBody.appendChild(currentDiv);
			currentDiv.classList.add(
				'ftlabs-translation--split-view-embellishment'
			);
			currentDiv.appendChild(element);

			currentDiv = document.createElement('div');
			articleBody.appendChild(currentDiv);
			currentDiv.classList.add('ftlabs-translation--split-view');
			currentDiv.setAttribute('data-split-container', '0');
		}
	});
}

function initSplitView() {
	try {
		var splitViewSelection = document.querySelectorAll(
			'.ftlabs-translation-options-selection'
		)[1];
		var splitViewOptions = Array.from(splitViewSelection.children);
		splitViewOptions.forEach((element) => {
			Array.from(element.children).forEach((element) => {
				if (
					element.value === splitStyleAction('get') &&
					element.tagName === 'INPUT'
				) {
					element.checked = true;
				}

				element.addEventListener('click', () => {
					switch (element.getAttribute('for')) {
						case 'standard':
							mobileViewClassAction(
								'remove',
								splitStyleAction('get')
							);
							window.localStorage.setItem(
								'FT.translationStyle',
								element.value
							);
							removeSplitView();
							break;
						case 'split':
							mobileViewClassAction('add', 'stacked');
							window.localStorage.setItem(
								'FT.translationStyle',
								element.value
							);
							splitView();
							break;
						default:
							mobileSplitViewChange(
								element.value,
								splitStyleAction('get')
							);
					}
					window.localStorage.setItem(
						'FT.translationStyle',
						element.value
					);
				});
			});
		});
	} catch (err) {
		console.log(err);
	}
}

function mobileSplitViewChange(newStyle, previousStyle) {
	var articleBody = document.querySelector('.article__content-body');
	if (
		!Array.from(articleBody.classList).includes(
			'ftlabs-translation--split-view-container'
		)
	) {
		splitView();
	}
	if (articleBody) {
		mobileViewClassAction('remove', previousStyle);
		mobileViewClassAction('add', newStyle);
	}
}

function mobileViewClassAction(action, style) {
	var articleBody = document.querySelector('.article__content-body');
	var topperHeadline = document.querySelector('.topper__headline');
	var topperStandfirst = document.querySelector('.topper__standfirst');
	articleBody.classList[action](
		'ftlabs-translation--split-view-style__' + style
	);
	topperHeadline.classList[action](
		'ftlabs-translation--split-view-style__' + style
	);
	topperStandfirst.classList[action](
		'ftlabs-translation--split-view-style__' + style
	);
}

function splitStyleAction(method, value) {
	return window.localStorage[`${method}Item`]('FT.translationStyle', value);
}

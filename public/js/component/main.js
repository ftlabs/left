var translator;
var articleTitle = document.querySelector('h1.topper__headline span');
var articleStandfirst = document.querySelector('.topper__standfirst');
var articleText = document.querySelectorAll('.article__content-body > p');
var translationLoading = document.querySelector('.ftlabs-translation--loading');
var translationCollapsed = document.querySelector('.ftlabs-translation__accordion--collapsed');
var translationExpanded = document.querySelector('.ftlabs-translation__accordion--expanded');
var turnOffButton = document.querySelector('.ftlabs-translation__button--off');
var languageSelect = document.querySelector('.ftlabs-translation__select--language');
var translateAll = document.querySelector('.ftlabs-translation__tickbox input[type="checkbox"]');
var translationPrompt = document.querySelector('.ftlabs-translation__prompt');
var accordionButton = document.querySelector('.ftlabs-translation__toggle');
var translationError = document.querySelector('.ftlabs-translation--error');
var disclaimer = document.querySelector('.ftlabs-translation__disclaimer');
var articleId = document.querySelector('article').getAttribute('data-content-id');
var pubDate = document.querySelector('.article-info__time-byline time').getAttribute('datetime');
var localTranslations = {};

function init(langs) {
    var widget = document.querySelector('.ftlabs-translation__accordion');
    var feedback = document.querySelector('.ftlabs-translation-feedback');
    widget.classList.remove('ftlabs-translation--hidden');
    feedback.classList.remove('ftlabs-translation--hidden');

    for (var i = 0; i < langs.length; ++i) {
        var option = document.createElement('option');
        option.value = langs[i].code;
        option.text = langs[i].name;

        option.setAttribute('data-cached', langs[i].cached);

        languageSelect.appendChild(option);
    }

    initSplitView();

    languageSelect.addEventListener('change', showTranslation);
    turnOffButton.addEventListener('click', removeTranslation);
    accordionButton.addEventListener('click', toggleTranslationAccordion);

    var translateSetting = window.localStorage.getItem('FT.translateAll');
    if (translateSetting !== null) {
        translateAll.checked = true;
        languageSelect.value = translateSetting;

        if (!!languageSelect.value) {
            logComponentInteractions('automatic-translation', languageSelect.value);
            languageSelect.dispatchEvent(new Event('change'));
        } else {
            languageSelect.selectedIndex = 0;
        }
    }
    translateAll.addEventListener('change', toggleTranslateAll);
}

function toggleTranslationAccordion() {
    translationExpanded.classList.toggle('ftlabs-translation--hidden');
    accordionButton.innerText = getAccordionCTA();

    var state = translationExpanded.classList.contains('ftlabs-translation--hidden') ? 'collapsed' : 'expanded';
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

function showTranslation(e) {
    showTranslationSplitView();

    e.preventDefault();

    var languageCode = e.target.value;
    var language = e.target[e.target.selectedIndex].text;
    var fromCache = e.target[e.target.selectedIndex].getAttribute('data-cached');

    translationError.classList.add('ftlabs-translation--hidden');
    translationCollapsed.classList.add('ftlabs-translation--blur');
    translationExpanded.classList.add('ftlabs-translation--blur');
    translationLoading.classList.remove('ftlabs-translation--hidden');

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
        return successfulTranslationRequest(localTranslations[`${languageCode.toLowerCase()}`], language);
    } else if (fromCache === 'true') {
        logComponentInteractions('translation-from-cache', languageCode);
        fetchOptions.body += '&fromCache=true';
    }

    fetch(`https://ftlabs-left.herokuapp.com/article/${articleId}/${languageCode.toLowerCase()}`, fetchOptions)
        .then(res => res.json())
        .then(data => {
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
        })
        .catch(err => {
            unsuccessfulTranslationRequest(JSON.stringify(err));
        });
}

function unsuccessfulTranslationRequest(err) {
    translationCollapsed.classList.remove('ftlabs-translation--blur');
    translationExpanded.classList.remove('ftlabs-translation--blur');
    translationLoading.classList.add('ftlabs-translation--hidden');
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
            articleStandfirst.setAttribute('data-original', articleStandfirst.innerHTML);
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

    translationCollapsed.classList.remove('ftlabs-translation--blur');
    translationExpanded.classList.remove('ftlabs-translation--blur');
    translationLoading.classList.add('ftlabs-translation--hidden');
    turnOffButton.classList.remove('ftlabs-translation--hidden');

    translationPrompt.innerHTML = 'This article has been translated into ' + language;
}

function removeTranslation() {
    logComponentInteractions('translation-off');

    removeTranslationSplitView();
    toggleTranslationAccordion();

    var articleTitle = document.querySelector('h1.topper__headline span');

    articleTitle.textContent = articleTitle.getAttribute('data-original');

    if (articleStandfirst.textContent.length > 0) {
        articleStandfirst.innerHTML = articleTitle.getAttribute('data-original');
    }

    Array.from(articleText).forEach(paragraph => {
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

fetch(`https://ftlabs-left.herokuapp.com/check/${articleId}/${pubDate}`)
    .then(res => res.json())
    .then(data => {
        if (data.displayWidget) {
            translator = data.translator;
            init(data.languages);
        } else {
            logComponentInteractions('no-display');
        }
    })
    .catch(err => {
        logComponentInteractions('display-check-error', 'EN', JSON.stringify(err));
    });
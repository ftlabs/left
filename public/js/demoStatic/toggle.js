function init() {
	document.querySelector('.translation-text').classList.add('hidden');
}

function toggleTranslationAccordion() {
	document.querySelector('.demo-target').classList.toggle('hidden');
	var accordionButton = document.querySelector('.accordion-button');

	accordionButton.innerText =
		accordionButton.innerText == 'Hide' ? 'Try it' : 'Hide';

	accordionButton.classList.toggle('o-buttons-icon--arrow-down');
	accordionButton.classList.toggle('o-buttons-icon--arrow-up');
}

function showTranslation(e) {
	e.preventDefault();
	document.querySelector('.article-text').classList.add('hidden');
	document.querySelector('.translation-text').classList.remove('hidden');
	document.querySelector('.turn-off-button').classList.remove('hidden');
	toggleTranslationAccordion();
	document.querySelector('.translation-prompt').innerHTML =
		'This article has been translated into French';
	document.querySelector('.accordion-button').innerText = 'Change';
}

function removeTranslation() {
	document.querySelector('.article-text').classList.remove('hidden');
	document.querySelector('.translation-text').classList.add('hidden');
	document.querySelector('.turn-off-button').classList.add('hidden');
	document.querySelector('.language-select').selectedIndex = 0;
	document.querySelector('.translation-prompt').innerHTML =
		'Now you can translate articles on the FT';
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

var accordionButton = document.querySelector('.accordion-button');

function init() {
	document.querySelector('.translation-body').classList.add('hidden');
}

function toggleTranslationAccordion() {
	document.querySelector('.demo-target').classList.toggle('hidden');

	accordionButton.innerText =
		accordionButton.innerText == 'Hide' ? 'Try it' : 'Hide';

	accordionButton.classList.toggle('o-buttons-icon--arrow-down');
	accordionButton.classList.toggle('o-buttons-icon--arrow-up');
}

function toggleTranslation(e) {
	e.preventDefault();
	Array.from(document.getElementsByClassName('text-body')).forEach(function(e) {
		e.classList.toggle('hidden');
	});

	toggleTranslationAccordion();
}

document
	.querySelector('.translate-button')
	.addEventListener('click', toggleTranslation);

accordionButton.addEventListener('click', () =>
	toggleTranslationAccordion(accordionButton)
);

document.addEventListener('DOMContentLoaded', init);

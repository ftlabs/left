var Utils = Origami['o-utils'];

function init() {
	setChildrenDataAttributes();
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
		Array.from(element.children)
			.filter(element => element.nodeName == 'P')
			.forEach((element, index) => {
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

document.addEventListener('DOMContentLoaded', init);

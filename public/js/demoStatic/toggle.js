function init() {}

function toggleTranslation() {
	Array.from(document.getElementsByClassName('text-body')).forEach(e => {
		Array.from(e.classList).includes('hidden')
			? (e.className = 'text-body')
			: (e.className = 'text-body hidden');
	});
}

document
	.getElementById('translateButton')
	.addEventListener('click', toggleTranslation);

document.addEventListener('DOMContentLoaded', init);

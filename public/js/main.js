var rootUrl = window.location.href;

function init() {
	var form = document.getElementById('translateForm');
	form.addEventListener('submit', getTranslation);
}

function getTranslation(e) {
	e.preventDefault();

	var input = e.target.querySelector('#articleUUID');
	var textArea = e.target.querySelector('#freeText');
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

	if(textArea.value !== '') {
		isFreeText = true;
	} else if(input.value === '') {
		alert('UUID is required');
		return;
	} else if(!uuidMatch.test(input.value)) {
		alert('Invalid UUID');
		return;
	}

	if(language.value === '') {
		alert('Select a language to translate to');
		return;
	}

	if(isFreeText) {
		//TODO: translators should be checkboxes
		fetchOptions.body = JSON.stringify({ text: textArea.value, translators: window.FTLabs.translators.split(',') });

		return fetch(rootUrl + 'translation/' + language.value, fetchOptions)
			.then(res => res.json())
			.then(data => {
				displayText(data);
			})
			.catch(err => console.log(err));
	}

	fetchOptions.body = JSON.stringify({translators: window.FTLabs.translators.split(',') });

	fetch(rootUrl + 'article/' + input.value +'/' + language.value, fetchOptions)
		.then(res => res.json())
		.then(data => {
			displayText(data);
		})
		.catch(err => console.log(err));
}

function displayText(data) {
	var original = document.querySelector('#original .text-body');
	var deepl_tr = document.querySelector('#deepl .text-body');
	var deepl_txt = data.deepl.toString();

	var google_tr = document.querySelector('#google .text-body');
	var google_txt = data.google;

	var aws_tr = document.querySelector('#aws .text-body');
	var aws_txt = data.aws;

	original.textContent = data.original;
	deepl_tr.textContent = deepl_txt;
	google_tr.textContent = google_txt;
	aws_tr.textContent = aws_txt;

	document.getElementById('output').classList.remove('cape');
}

document.addEventListener('DOMContentLoaded', init);
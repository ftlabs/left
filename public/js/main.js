var rootUrl = window.location.href;

function init() {
	fetch(rootUrl +'support')
		.then(res => res.json())
		.then(data => setupLangs(data))
		.catch(err => console.log(err));

	var form = document.getElementById('translateForm');
	form.addEventListener('submit', getTranslation);
}

function setupLangs(data) {
	var selection = document.getElementById('langSelect');

	for(var i =0; i < data.lang.length; ++i) {
		var option = document.createElement('option');
		option.value = data.lang[i];
		option.textContent = data.lang[i];

		selection.append(option);
	}
}

function getTranslation(e) {
	e.preventDefault();

	var input = e.target.querySelector('#articleUUID');
	var textArea = e.target.querySelector('#freeText');
	var uuidMatch = /^([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})/g;
	var language = e.target.querySelector('#langSelect');
	var isFreeText = false;

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
		var fetchOptions = {
			headers: {
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: JSON.stringify({ text: textArea.value }),
			credentials: 'same-origin'
		};

		return fetch(rootUrl + 'translation/' + language.value, fetchOptions)
			.then(res => res.json())
			.then(data => {
				displayText(data);
			})
			.catch(err => console.log(err));
	}

	fetch(rootUrl + 'article/' + input.value +'/' + language.value)
		.then(res => res.json())
		.then(data => {
			displayText(data);
		})
		.catch(err => console.log(err));
}

function displayText(data) {
	var original = document.querySelector('#original .text-body');
	var deepl_tr = document.querySelector('#deepl .text-body');
	var deepl_txt = data.deepl;

	var google_tr = document.querySelector('#google .text-body');
	var google_txt = data.google;

	if(deepl_txt !== undefined && deepl_txt.charAt(0) === '\"') {
		//Quick hack to fix rogue strarting quote: to be checked on articles that actually start with quotes
		deepl_txt = deepl_txt.substr(1);
	}

	original.textContent = data.original;
	deepl_tr.textContent = deepl_txt;
	google_tr.textContent = google_txt;

	document.getElementById('output').classList.remove('cape');
}

document.addEventListener('DOMContentLoaded', init);
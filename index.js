if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 2018;
const extract = require('./bin/lib/utils/extract-text');

const CAPI = require('./bin/lib/api').init(process.env.FT_API_KEY);
const Translator = require('./bin/lib/multi-translator');


app.use(express.static(path.resolve(__dirname + "/public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.get('/article/:uuid/:lang', (req,res) => {
	const uuid = req.params.uuid;
	const lang = req.params.lang;

	return CAPI.get(uuid)
	.then(async data => {
		const text = extract(data.bodyXML);
		const translate = await Translator.translate(['deepl', 'google'], {text: text, to: lang});

		translate.original = text;
		translate.article = uuid;

		res.json(translate);
	})
	.catch(err => {
		console.log('CAPI ERROR', err);
		res.json({err: err});
	});
});

app.post('/translation/:lang', (req, res) => {
	const text = req.body.text;
	const lang = req.params.lang;

	Translator.translate(['deepl', 'google'], {text: text, to: lang})
	.then(data => {
		data.original = text;
		res.json(data);
	})
	.catch(err => console.log(err));
});

app.get('/support', (req, res) => {
	res.json({lang: ['EN', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL']});
	//TODO: move to support module
});

console.log(`Server is running locally on port ${PORT}`);
app.listen(PORT);
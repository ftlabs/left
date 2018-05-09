if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const s3o = require('@financial-times/s3o-middleware');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 2018;
const extract = require('./bin/lib/utils/extract-text');
const hbs = require('hbs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const googleTokenPath = path.resolve(`${__dirname}/keyfile.json`);
fs.writeFileSync(googleTokenPath , process.env.GOOGLE_CREDS);

const CAPI = require('./bin/lib/api').init(process.env.FT_API_KEY);
const Translator = require('./bin/lib/multi-translator');
const Utils = require('./bin/lib/utils/utils');


app.post('/article/:uuid/:lang', (req,res) => {
	const uuid = req.params.uuid;
	const lang = req.params.lang;
	const translators = req.body.translators;

	return CAPI.get(uuid)
	.then(async data => {
		const text = extract(data.bodyXML);
		const translate = await Translator.translate(translators, {text: text, to: lang});

		translate.original = text;
		translate.article = uuid;
		translate.outputs = ['original'].concat(translators);

		res.json(translate);
	})
	.catch(err => {
		console.log('CAPI ERROR', err);
		res.json({ original: { error: `Error, cannot find article with uuid ${uuid}`}, outputs: ['original']});
	});
});

app.post('/translation/:lang', (req, res) => {
	const text = req.body.text;
	const lang = req.params.lang;
	const translators = req.body.translators;

	Translator.translate(translators, {text: text, to: lang})
	.then(data => {
		data.original = text;
		data.outputs = ['original'].concat(translators);
		res.json(data);
	})
	.catch(err => console.log(err));
});


app.use(s3o);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use('/client', express.static(path.resolve(__dirname + "/public")));

app.get('/', (req, res) => {
	const settings = Translator.settings(Utils.extractUser(req.headers.cookie));
	res.render('index', settings);
});

console.log(`Server is running locally on port ${PORT}`);
app.listen(PORT);
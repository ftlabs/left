if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const s3o = require('@financial-times/s3o-middleware');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const helmet = require('helmet');
const express_enforces_ssl = require('express-enforces-ssl');
const PORT = process.env.PORT || 2018;
const extract = require('./bin/lib/utils/extract-text');
const hbs = require('hbs');

if (process.env.NODE_ENV === 'production') {
	app.use(helmet());
	app.enable('trust proxy');
	app.use(express_enforces_ssl());
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const googleTokenPath = path.resolve(`${__dirname}/keyfile.json`);
fs.writeFileSync(googleTokenPath, process.env.GOOGLE_CREDS);

const CAPI = require('./bin/lib/capi').init(process.env.FT_API_KEY);
const Translator = require('./bin/lib/multi-translator');
const Utils = require('./bin/lib/utils/utils');
const Lexicon = require('./bin/lib/lexicon').init(process.env.LEXICON_API_KEY);

function maybeAppendDot(text) {
	return text + (text.endsWith('?') ? '' : '.');
}

async function generateTranslations(
	translatorNames,
	text,
	lang,
	firstChunkOnly
) {
	const extractedText = extract(text);
	const translations = await Translator.translate(translatorNames, {
		text: extractedText,
		to: lang,
		firstChunkOnly: firstChunkOnly
	});

	translations.original = extractedText;
	translations.outputs = ['original'].concat(translatorNames);

	// convert \n\n-separated blocks of text into <p>-wrapped blocks of text
	translations.outputs.map(translatorName => {
		const textWithBackslashNs = translations[translatorName];
		const paras = textWithBackslashNs.split('\n\n').map(para => {
			return `<p>${para}</p>`;
		});
		const textWithParas = paras.join('\n');
		translations[translatorName] = textWithParas;
	});

	return translations;
}

app.post('/article/:uuid/:lang', (req, res) => {
	const uuid = req.params.uuid;
	const lang = req.params.lang;
	const translators = req.body.translators;
	const firstChunkOnly =
		!req.query.hasOwnProperty('firstChunkOnly') || !!req.query.firstChunkOnly; // default is firstChunkOnly=true

	CAPI.get(uuid)
		.then(async data => {
			const text = data.bodyXML;
			const title = maybeAppendDot(data.title);
			const standfirst = maybeAppendDot(data.standfirst); // adding a closing . improves the translation
			const combinedText =
				'Title: ' +
				title +
				'\n\n' +
				'Standfirst: ' +
				standfirst +
				'\n\n' +
				text;

			generateTranslations(
				translators,
				combinedText,
				lang,
				firstChunkOnly
			).then(translations => {
				translations.article = uuid;
				res.json(translations);
			});
		})
		.catch(err => {
			console.log('CAPI ERROR', err);
			res.json({
				original: { error: `Error, cannot find article with uuid ${uuid}` },
				outputs: ['original']
			});
		});
});

app.post('/translation/:lang', (req, res) => {
	const text = req.body.text;
	const lang = req.params.lang;
	const translators = req.body.translators;
	const firstChunkOnly =
		!req.query.hasOwnProperty('firstChunkOnly') || !!req.query.firstChunkOnly; // default is firstChunkOnly=true

	generateTranslations(translators, text, lang, firstChunkOnly)
		.then(translations => {
			res.json(translations);
		})
		.catch(err => {
			console.log('Translation ERROR', err);
			res.json({
				original: { error: `Error, cannot translate text` },
				outputs: err
			});
		});
});

app.post('/lexicon/:lang', (req, res) => {
	const lexQuery = req.body.text;
	const lang = req.params.lang;
	const translators = req.body.translators;
	const firstChunkOnly =
		!req.query.hasOwnProperty('firstChunkOnly') || !!req.query.firstChunkOnly; // default is firstChunkOnly=true
	return Lexicon.search(lexQuery)
		.then(async text => {
			const combinedText = 'Lexicon Search Term: ' + lexQuery + '\n\n' + text;
			const translations = await generateTranslations(
				translators,
				combinedText,
				lang,
				firstChunkOnly
			);
			res.json(translations);
		})
		.catch(err => {
			console.log('CAPI ERROR', err);
			res.json({
				original: {
					error: `Error, cannot translate lexicon query ${lexQuery}`
				},
				outputs: err
			});
		});
});

app.use(s3o);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');
app.use('/client', express.static(path.resolve(__dirname + '/public')));

app.get('/', (req, res) => {
	const settings = Translator.settings(Utils.extractUser(req.headers.cookie));
	res.render('index', settings);
});

app.get('/demo/:uuid', (req, res) => {
	CAPI.get(req.params.uuid).then(data => {
		const text = data.bodyXML;
		const { title, byline, standfirst } = data;

		res.render('demo', { text, title, byline, standfirst });
	});
});

app.get('/demo-static/:demoType', (req, res) => {
	const demoType = req.params.demoType;
	const availableDemos = ['side-by-side', 'toggle'];
	if (availableDemos.includes(demoType)) {
		res.render('demoStatic', { demoType });
	} else {
		res
			.status(500)
			.send(
				`Demo type not recognised. The available types are: ${availableDemos.join(
					', '
				)}`
			);
	}
});

console.log(`Server is running locally on port ${PORT}`);
app.listen(PORT);

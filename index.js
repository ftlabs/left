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
const LIMITS = require('./bin/lib/aws/translation-api-limit');
const CACHE = require('./bin/lib/aws/translation-cache-table');
const CHECKS = require('./bin/lib/utils/display-checks');
const { get: getFile} = require('./bin/lib/aws/translation-cache-bucket');

if (process.env.NODE_ENV === 'production') {
	app.use(helmet());
	app.enable('trust proxy');
	app.use(express_enforces_ssl());
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const googleTokenPath = path.resolve(`${__dirname}/keyfile.json`);
fs.writeFileSync(googleTokenPath, process.env.GOOGLE_CREDS);

const CAPI = require('./bin/lib/ft/capi').init(process.env.FT_API_KEY);
const Translator = require('./bin/lib/translators/multi-translator');
const Utils = require('./bin/lib/utils/utils');
const Audio = require('./bin/lib/utils/get-audio');
const Lexicon = require('./bin/lib/ft/lexicon').init(process.env.LEXICON_API_KEY);

async function generateTranslations(
	translatorNames,
	text,
	lang,
	firstChunkOnly,
	hasStandfirst = false,
	langFrom = false
) {
	const extractedText = extract(text);
	let translations = {
		texts: {}, // name -> text
		translatorNames: [], // names
		audioUrls: {}, // name -> url
		audioButtonText: {} // name -> text
	};

	translations.texts = await Translator.translate(translatorNames, {
		text: extractedText,
		to: lang,
		from: langFrom,
		firstChunkOnly: firstChunkOnly
	});
	translations.texts['original'] = extractedText;
	translations.translatorNames = ['original'].concat(translatorNames);

	LIMITS.updateApiLimitUsed(translatorNames, extractedText.replace(/\s/g, "").length);

	translations = Utils.formatOutput(translations, hasStandfirst);
	translations = Audio.get(translations, lang);

	return translations;
}

app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept'
	);
	next();
});

app.post('/article/:uuid/:lang', (req, res, next) => {
	res.uuid = req.params.uuid;
	res.lang = req.params.lang;
	res.langFrom = req.body.from;
	const fromCache = req.body.fromCache;
	const checkCache = req.body.checkCache;

	res.translators = JSON.parse(req.body.translators);

	if (fromCache) {
		return getFile(`${res.uuid}_${res.translators[0]}`)
			.then(data => res.json(data))
			.catch(err => console.log(err));
	}
	
	res.firstChunkOnly =
		!req.query.hasOwnProperty('firstChunkOnly') || !!req.query.firstChunkOnly; // default is firstChunkOnly=true

	CAPI.get(res.uuid)
		.then(async data => {
			const text = data.bodyXML;
			const title = Utils.maybeAppendDot(data.title);
			res.standfirst = '';
			if (data.standfirst) {
				res.standfirst = Utils.maybeAppendDot(data.standfirst);
			} // adding a closing . improves the translation
			res.combinedText = title + '\n\n' + res.standfirst + '\n\n' + text;
			res.pubDate = data.publishedDate;

			if(checkCache) {
				const promises = [];
				for(let i = 0; i < res.translators.length; ++i) {
					const check = CACHE.checkAndGet(`${res.uuid}_${res.translators[i]}`, res.lang.toLowerCase());
					promises.push(check);
				}
				
				return Promise.all(promises)
					.then(data => {
						if(data.every( item => item === data[0] )) {
							return next();
						}

						const names = ['original'].concat(res.translators);
						const newTranslations = [];
						const cachedTranslations = [];

						let formattedResult = {
							article: res.uuid,
							texts: {
								'original': extract(res.combinedText)
							},
							translatorNames: names,
							audioUrls: {},
							audioButtonText: {}
						}

						for(let i = 0; i < data.length; ++i) {
							if(!data[i]) {
								newTranslations.push(res.translators[i]);
							} else {
								cachedTranslations.push(res.translators[i]);
								formattedResult.texts[res.translators[i]] = JSON.parse(data[i])[res.lang.toLowerCase()];
							}
						}

						formattedResult = Utils.formatOutput(formattedResult, !!res.standfirst, true, cachedTranslations.concat('original'));
						formattedResult = Audio.get(formattedResult, res.lang, cachedTranslations.concat('original'));

						if(newTranslations.length > 0) {
							if(cachedTranslations.length > 0) {
								res.translators = newTranslations;
								res.formattedResult = formattedResult;
							}
							return next();
						} else {
							return res.json(formattedResult);
						}
					})
					.catch(err => console.log('CHECK cache error', err));
					
			} else {
				return next();
			}
		})
		.catch(err => {
			console.log('CAPI ERROR', err);
			res.json({
				original: { error: `Error, cannot find article with uuid ${res.uuid}` },
				outputs: ['original']
			});
		});
}, (req, res) => {
	generateTranslations(
		res.translators,
		res.combinedText,
		res.lang,
		res.firstChunkOnly,
		res.standfirst,
		res.langFrom
	).then(translations => {
		for(let i = 0; i < res.translators.length; ++i) {
			if(res.translators[i] !== 'original') {
				CACHE.update({uuid: res.uuid, lang: res.lang, lastPubDate: res.pubDate, translation: translations.texts[res.translators[i]], translator: res.translators[i]});
			}
		}
		translations.article = res.uuid;

		if(res.formattedResult) {
			translations.translatorNames = res.formattedResult.translatorNames;
			translations.texts = Object.assign(res.formattedResult.texts, translations.texts);
			translations.audioUrls = Object.assign(res.formattedResult.audioUrls, translations.audioUrls);
			translations.audioButtonText = Object.assign(res.formattedResult.audioButtonText, translations.audioButtonText);
		}

		return res.json(translations);
	})
	.catch(err => console.log(err));
});

app.post('/translation/:lang', (req, res) => {
	const text = req.body.text;
	const lang = req.params.lang;

	const translators = JSON.parse(req.body.translators);
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
	const langFrom = req.body.from; 

	const translators = JSON.parse(req.body.translators);
	const firstChunkOnly =
		!req.query.hasOwnProperty('firstChunkOnly') || !!req.query.firstChunkOnly; // default is firstChunkOnly=true
	return Lexicon.search(lexQuery)
		.then(async text => {
			const combinedText = 'Lexicon Search Term: ' + lexQuery + '\n\n' + text;
			const translations = await generateTranslations(
				translators,
				combinedText,
				lang,
				firstChunkOnly,
				false,
				langFrom
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

app.get('/check/:uuid/:pubDate', async (req, res) => {
	const uuid = req.params.uuid;
	const translator = process.env.NEXT_TRANSLATOR;
	const lastPubDate = req.params.pubDate;

	CHECKS.check(uuid, translator, lastPubDate)
		.then(data => { return res.json(data) })
		.catch(err => console.log(err));
});

app.use(s3o);
app.use('/client', express.static(path.resolve(__dirname + '/public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');

app.get('/', async (req, res) => {
	const settings = await Translator.settings(Utils.extractUser(req.headers.cookie));
	return res.render('index', settings);
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
	let toggle = false;
	if (demoType === 'toggle') toggle = true;
	if (availableDemos.includes(demoType)) {
		res.render('demoStatic', { demoType, toggle });
	} else {
		res
			.status(500)
			.send(
				`Demo type not recognised. The available types are: ${availableDemos.join(', ')}`
			);
	}
});

app.get('/get-translation/:uuid/:language', (req, res) => {
	const uuid = req.params.uuid;
	const language = req.params.language;
	fs.readFile(`./public/demoTranslations/${uuid}.json`, (err, data) => {
		res.json(JSON.parse(data)[language]);
	});
});

console.log(`Server is running locally on port ${PORT}`);
app.listen(PORT);

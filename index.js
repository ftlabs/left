if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const Utils = require('./bin/lib/utils/utils');
const s3o = require('@financial-times/s3o-middleware');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const helmet = require('helmet');
const express_enforces_ssl = require('express-enforces-ssl');
const PORT = Utils.processEnv('PORT', {validateInteger: true, default: "2018"});
const extract = require('./bin/lib/utils/extract-text');
const hbs = require('hbs');
const LIMITS = require('./bin/lib/aws/translation-api-limit');
const CACHE = require('./bin/lib/aws/translation-cache-table');
const CHECKS = require('./bin/lib/utils/display-checks');
const { get: getFile} = require('./bin/lib/aws/translation-cache-bucket');
const Tracking = require('./bin/lib/utils/tracking');

if (process.env.NODE_ENV === 'production') {
	app.use(helmet());
	app.enable('trust proxy');
	app.use(express_enforces_ssl());
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const googleTokenPath = path.resolve(`${__dirname}/keyfile.json`);
fs.writeFileSync(googleTokenPath, Utils.processEnv('GOOGLE_CREDS'));

const CAPI = require('./bin/lib/ft/capi').init(Utils.processEnv('FT_API_KEY'));
const Translator = require('./bin/lib/translators/multi-translator');
const Audio = require('./bin/lib/utils/get-audio');
const Lexicon = require('./bin/lib/ft/lexicon').init(Utils.processEnv('LEXICON_API_KEY'));

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
		Tracking.splunk(`request=article uuid=${res.uuid} language=${res.lang} type=fromCache translators=${res.translators}`);
		return getFile(`${res.uuid}_${res.translators[0]}`)
			.then(data => res.json(data))
			.catch(err => Tracking.splunk(`error="getFile error" message=${JSON.stringify(err)} route=/article/${res.uuid}/${res.lang}`));
	}

	Tracking.splunk(`request=article uuid=${res.uuid} language=${res.lang} translators=${res.translators}`);

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
			res.pubDate = data.lastModified;

			if(checkCache) {
				const promises = [];
				for(let i = 0; i < res.translators.length; ++i) {
					const check = CACHE.checkAndGet(`${res.uuid}_${res.translators[i]}`, res.lang.toLowerCase(), res.pubDate);
					promises.push(check);
				}

				return Promise.all(promises)
					.then(data => {
						if(data.length !== 1 && data.every( item => item === data[0] )) {
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
					.catch(err => Tracking.splunk(`error="Check cache error" message=${JSON.stringify(err)} route=/article/${res.uuid}/${res.lang}`));

			} else {
				return next();
			}
		})
		.catch(err => {
			Tracking.splunk(`error="CAPI error" message=${JSON.stringify(err)} route=/article/${res.uuid}/${res.lang}`);
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
	.catch(err => Tracking.splunk(`error=Generate translations message=${JSON.stringify(err)} route=/article/${res.uuid}/${res.lang}`));
});

app.post('/translation/:lang', (req, res) => {
	const text = req.body.text;
	const lang = req.params.lang;

	const translators = JSON.parse(req.body.translators);
	const firstChunkOnly =
		!req.query.hasOwnProperty('firstChunkOnly') || !!req.query.firstChunkOnly; // default is firstChunkOnly=true

	Tracking.splunk(`request=freeText language=${lang} translators=${translators}`);

	generateTranslations(translators, text, lang, firstChunkOnly)
		.then(translations => {
			res.json(translations);
		})
		.catch(err => {
			Tracking.splunk(`error="Generate translation error" message=${JSON.stringify(err)} route=/translation/${lang}`);
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

	Tracking.splunk(`request=lexicon term=${lexQuery} language=${lang} translators=${translators}`);

	return Lexicon.search(lexQuery)
		.then(async text => {
			const combinedText = 'Lexicon Search Term: ' + lexQuery + '\n\n' + extract(text);
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
			Tracking.splunk(`error="Lexicon error" message=${JSON.stringify(err)} route=/lexicon/${lang}`);
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
	const translator = Utils.processEnv('NEXT_TRANSLATOR');
	const clientPubDate = req.params.pubDate;

	const lastPubDate = await CAPI.get(uuid)
		.then(async data => {
			if(data.lastModified) {
				return data.lastModified;
			}
			return data.publishedDate;
		})
		.catch(err => {
			console.log(err);
			return clientPubDate;
		});

	Tracking.splunk(`request=NextDisplay uuid=${res.uuid}`);

	CHECKS.check(uuid, translator, lastPubDate)
		.then(data => { return res.json(data) })
		.catch(err => Tracking.splunk(`error="Display check" message=${JSON.stringify(err)} route=/check/${uuid}/${lastPubDate}`));
});


app.use('/client', express.static(path.resolve(__dirname + '/public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');

app.get('/content/:uuid', (req,res) => {
	const uuid = req.params.uuid;
	const exampleUUIDs = process.env.USER_TEST_UUIDS.split(',');
	const data = {};

	Tracking.splunk(`request=content uuid=${uuid}`);

	switch(uuid) {
		case exampleUUIDs[1]:
			data.partial2 = true;
		break;
		
		case exampleUUIDs[2]:
			data.partial3 = true;
		break;

		case exampleUUIDs[0]:
		default:
			data.partial1 = true;
	}

	res.render('content', data);
});

app.use(s3o);

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

if (process.env.NODE_ENV !== 'production') console.log(`Server is running locally on port ${PORT}`);
app.listen(PORT);

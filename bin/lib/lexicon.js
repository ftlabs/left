const fetch = require('node-fetch');
const LEXICON_URL = 'http://markets.ft.com/research/webservices/lexicon/v1/terms';

const Utils = require('./utils/utils');

function init(apiKey) {
	this.apiKey = apiKey;
	return this;
}

async function search(query) {
	let results = [];

	const options = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'GET',
		mode: 'cors'
	};

	const url = `${LEXICON_URL}?query=${query}`;
	// const data = await sendRequest(url, options);
	const data = { // temporarily copied from http://markets.ft.com/research/webservices/lexicon/v1/docs
  "data": {
    "items": [
      {
        "lastModifiedDate": "2015-06-10T14:29:41",
        "insertDate": "2015-06-10T14:29:41",
        "name": "banker's acceptance  BA rate",
        "definition": "See &lt;A href=&quot;http://lexicon.ft.com/term.asp?t=acceptance&quot;&gt;acceptance&lt;/A&gt;.",
        "url": "http://lexicon.ft.com/term?term=banker's-acceptance--BA-rate",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:29:40",
        "insertDate": "2015-06-10T14:29:40",
        "name": "bank run",
        "definition": "Also known as run on a bank. Unusually heavy withdrawals by a bank's customers, normally sparked by fears that the bank may be in financial difficulties.",
        "url": "http://lexicon.ft.com/term?term=bank-run",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:29:38",
        "insertDate": "2015-06-10T14:29:38",
        "name": "bank (credit) line",
        "definition": "See &lt;A href=&quot;http://lexicon.ft.com/term.asp?t=credit-line&quot;&gt;credit line&lt;/A&gt;.",
        "url": "http://lexicon.ft.com/term?term=bank-(credit)-line",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:29:39",
        "insertDate": "2015-06-10T14:29:39",
        "name": "bank holding company",
        "definition": "Common in the US. A holding company that owns banks.",
        "url": "http://lexicon.ft.com/term?term=bank-holding-company",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:30:55",
        "insertDate": "2015-06-10T14:30:55",
        "name": "central bank intervention",
        "definition": "When a central bank enters the foreign exchange market to buy or sell currency in order to influence exchange rates. It may also intervene in the money markets to influence interest rates.",
        "url": "http://lexicon.ft.com/term?term=central-bank-intervention",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:29:39",
        "insertDate": "2015-06-10T14:29:39",
        "name": "bank discount basis",
        "definition": "See &lt;A href=&quot;http://lexicon.ft.com/term.asp?t=discount-yield&quot;&gt;discount yield&lt;/A&gt;.",
        "url": "http://lexicon.ft.com/term?term=bank-discount-basis",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:38:46",
        "insertDate": "2015-06-10T14:38:46",
        "name": "relationship banking",
        "definition": "A form of retail banking that involves direct advice to the customer by a bank officer, who remains a point of contact on a range of value added services, including portfolio management and insurance.",
        "url": "http://lexicon.ft.com/term?term=relationship-banking",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:33:50",
        "insertDate": "2015-06-10T14:33:50",
        "name": "export-import bank",
        "definition": "Many developed countries have export-import banks aimed at boosting trade with foreign countries. They are normally state-owned entities (thus able to get financing at favourable rates) that provide credit to domestic exporters and importers and also make loans overseas in order to boost trade with their home country.",
        "url": "http://lexicon.ft.com/term?term=export_import-bank",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:35:48",
        "insertDate": "2015-06-10T14:35:48",
        "name": "land bank",
        "definition": "The stock of land a property developer builds up for future projects.",
        "url": "http://lexicon.ft.com/term?term=land-bank",
        "categories": []
      },
      {
        "lastModifiedDate": "2015-06-10T14:31:22",
        "insertDate": "2015-06-10T14:31:22",
        "name": "commercial bank",
        "definition": "<p>This is a financial institution providing services for businesses, organisations and individuals. Services include offering current, deposit and saving accounts as well as giving out loans to businesses.&nbsp;[ref url=\"\"]Financial Times[/ref]</p> <p>A commercial banks is defined as a bank whose main business is deposit-taking and making loans. This contrasts with an <a title=\"investment bank definition from FT Lexicon\" href=\"http://lexicon.ft.com/Term?term=investment-bank\" target=\"_blank\">investment bank</a> whose main business is securities underwriting, M&amp;A advisory, asset management and securities trading.</p> <p>Commercial banks make their profits by taking small, short-term, relatively liquid deposits and transforming these into larger, longer maturity loans. This process of asset transformation generates net income for the commercial bank. Note that many commercial banks do investment banking business although the latter is not considered the main business area.</p> <p><strong>Example<br /></strong>Examples of commercial banks include HSBC and Bank of America Merill Lynch.<em>&nbsp;</em>[ref url=\"\"]Philip Molyneux, professor of banking and finance, Bangor Business School[/ref]</p> <p>A commercial bank is one primarily engaged in deposit and lending activities to private and corporate clients in wholesale and retail banking. Other services typically include bank and credit cards, private banking, custody and guarantees, cash management and settlement as well as trade finance.</p> <p>The term gained prominence as a counterpart to &ldquo;investment bank&rdquo; after the introduction of the Glass-Steagall-Act (1933) in the USA that separated capital markets business from deposit taking institutes in the aftermath of the great depression.</p> <p>However, the separation between commercial and investment banking softened more and more during the age of financial liberalisation and globalisation from 1990 to 2007. Banks moved away from low margin deposit and credit business to high margin capital market investments, accompanied with a respective increase in risk.</p> <p>This was backed by politicians and regulators, who increasingly reduced the influence of the state in the overall economy and, in particular, in the financial markets.</p> <p>Eventually the Clinton administration in the USA legalised universal banks, which cover both commercial and investment banking activities with the so-called Gramm-Leach-Bliley-Act in 1999, the basis for the typical business model of banks in continental Europe , which repealed key&nbsp;provisions&nbsp;of the Glass-Steagall Act.</p> <p>After the recent global financial crisis, however,&nbsp;financial regulation has become prominent once again in the US. The Frank-Dodd-Act implemented the Volcker rule in 2010, named after Alan Greenspan&rsquo;s predecessor as president of the US central bank, Fed. The Act bans at least proprietary trading of securities for deposit-taking institutes.&nbsp;[ref url=\"\"]Horst Loechel, adjunct professor of economics, Ceibs[/ref]</p> <p><em><br /></em></p>",
        "url": "http://lexicon.ft.com/term?term=commercial-bank",
        "categories": [
          {
            "name": "Banking"
          },
          {
            "name": "Basics of Finance"
          }
        ]
      }
    ],
    "query": "bank",
    "totalItems": 0,
    "itemsPerPage": 10,
    "startIndex": 0
  },
  "timeGenerated": "2018-05-15T09:41:50"
};

	if (data && data.data && data.data.items) {
		data.data.items.map( item => {
			if (item.definition && !item.definition.startsWith('See ')) {
				results.push(`Name: ${item.name}`);
				results.push(`Definition: ${item.definition}`);
				results.push(`---`);
			}
		});
	}

	console.log(`lexicon.search: data=${JSON.stringify(data, null, 2)}`);
	const resultsText = results.join('\n\n');
	return resultsText;
}

async function sendRequest(url, options) {
	return fetch(url, options)
		.then(res => {
			if(res.ok) {
				return res.json();
			} else {
				throw res;
			}
		})
		.then(data => data)
		.catch(err => {
			return { error: `Error ${err.status}: ${err.statusText}`};
		});
}

module.exports = {
	init: init,
	search: search,
	name: () => { return 'lexicon'; },
};

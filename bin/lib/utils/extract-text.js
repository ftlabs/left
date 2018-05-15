const cheerio = require('cheerio');

const IGNORE_ELEMENTS = 'recommended,ft-related,promo-box,pull-quote,big-number,table';

// Match a string of 3 or more characters with or without a space inbetween.
const VISUAL_SEPARATOR = /^(?:[\-\*\.]\s?){3,}$/g;

// Paragraph marks (pilcrows) may be used legitimately but doubling up should be safe!
const PARAGRAPH_MARK = '¶¶';

// This will greedily find any whitespace around the marks so we can remove it.
// There will often be whitespace as the .text() method works recursively on each el.
const PARAGRAPH_FIND = new RegExp(`\\s*${PARAGRAPH_MARK}\\s*`, 'g');
const PARAGRAPH_REPLACE = '\n\n';

module.exports = (xml) => {
	const $ = cheerio.load(xml, { decodeEntities: false, normalizeWhitespace: true });

	$(IGNORE_ELEMENTS).remove();

	const $paragraphs = $('p');

	// 1. Delimit each paragraph with a special character. We can't add newlines at
	//    this stage as whitespace normalization is enabled and they'll be cleaned up.
	//
	// 2. Remove any paragraphs which are intended to be visual separators, E.G.:
	//    <p>---</p> or <p>. . .</p> or <p>* * *</p>
	$paragraphs.each((i) => {
		const $ = $paragraphs.eq(i);
		const text = $.text().trim();

		if (text.length && !VISUAL_SEPARATOR.test(text)) {
			$.prepend(PARAGRAPH_MARK); // 1
		} else {
			$.remove(); // 2
		}
	});

	const text = $('body').text()
		.replace(PARAGRAPH_FIND, PARAGRAPH_REPLACE)
		.replace(/\[ref url=\"\"\]/g, ' (reference: ') // tidy up [ref ] malarky in lexicon responses
		.replace(/\[\/ref\]/g, ')')
		.trim();

	return text;
};

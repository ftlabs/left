function getS3OUserFromCookie(cookies) {
	let user = null;

	const cookieList = cookies.split(';');
	
	for(let i = 0; i < cookieList.length; ++i) {
		let cookiePair = cookieList[i].replace(' ', '');
		if(cookiePair.startsWith('s3o_username')) {
			user = cookiePair.split('=')[1];
		}
	}

	return user;
}

async function checkAndSplitText(text, limit, encoded = false) {
	const stringLength = Buffer.byteLength(text, 'utf8');
	const ratio = Math.ceil(stringLength/limit);

	if(ratio === 1) {
		return [text];
	}

	return splitText(text, limit, ratio, encoded);
}

function splitText(text, limit, parts, encoded) {
	const splitter = encoded?'%0A%0A':'\n\n';
	const paraSplit = text.split(splitter);
	const ratio = Math.ceil(paraSplit.length/parts);
	const newSplit = [];

	for(let i = 0; i < parts; ++i) {
		let part = chunkText(paraSplit, ratio, splitter);

		while (part.length > limit) {
			part = chunkText(paraSplit, part.index - 1, splitter);
		}
		newSplit.push(part.string);
		paraSplit.splice(0, part.index);
	}

	if(paraSplit.length > 0) {
		const lastPart = chunkText(paraSplit, paraSplit.length, splitter);
		newSplit.push(lastPart.string);
	}

	return newSplit;
}

function chunkText(strings, index, splitter) {
	const string = strings.slice(0, index).join(splitter);

	return {string: string, index: index, length: Buffer.byteLength(string, 'utf8')};
}

module.exports = {
	extractUser: getS3OUserFromCookie,
	checkTextLength: checkAndSplitText
};
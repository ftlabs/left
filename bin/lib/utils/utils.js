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

module.exports = {
	extractUser: getS3OUserFromCookie
};
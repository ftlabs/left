const AWS = require('aws-sdk');
const Utils = require('../utils/utils');

const region = Utils.processEnv('AWS_REGION');
const cacheBucket = Utils.processEnv('AWS_CACHE_BUCKET');

const S3 = new AWS.S3();

function getObject(fileName, ETag = false) {
	return new Promise((resolve, reject) => {
		S3.getObject({
			Bucket: cacheBucket,
			Key: `${fileName}.json`
		}, (err, data) => {
			if(err) {
				reject(err);
			} else {
				if(!ETag || (ETag && data.ETag === ETag)) {
					resolve(data.Body.toString('utf-8'));
				} else {
					reject({error: 'The translation is not up-to-date'});
				}
			}
		});
	});
}

function saveObject(fileName, translationData, updateType = 'update') {
	return new Promise((resolve, reject) => {
		const update = getObject(fileName)
		.then(data => {
			const file = JSON.parse(data);
			let newFile;
			if(updateType === 'update') {
				newFile = Object.assign(file, translationData);
			} else if(updateType === 'override') {
				newFile = translationData;
			}

			createFile(fileName, newFile)
				.then(data => resolve(data))
				.catch(err => reject(err));
		})
		.catch(err => {
			if(err.statusCode === 404) {
				createFile(fileName, translationData)
					.then(data => resolve(data))
					.catch(err => reject(err));
			} else {
				reject(err);
			}
		});
	});

}

function createFile(fileName, contents) {
	return new Promise((resolve, reject) => {
		S3.putObject({
			Bucket: cacheBucket,
			Key: `${fileName}.json`,
			Body: JSON.stringify(contents)
		}, (err, data) => {
			if(err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

module.exports = {
	get: getObject,
	save: saveObject
}

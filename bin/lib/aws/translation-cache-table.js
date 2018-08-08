const AWS = require('aws-sdk');

const cacheTable = process.env.CACHE_TABLE;
const region = process.env.AWS_REGION;

const database = new AWS.DynamoDB.DocumentClient({ region });
const BUCKET = require('./translation-cache-bucket');
const { getLatest } = require('../utils/utils');

function queryItemsInDatabase(uuid){
	const query = {
		TableName: cacheTable,
		KeyConditionExpression: "#uuid = :uuid",
		ExpressionAttributeNames: {
			"#uuid": "uuid"
		},
		ExpressionAttributeValues: {
			":uuid": uuid
		}
	};

	return new Promise( (resolve, reject) => {
		database.query(query, (err, data) => {
			if(err){
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

function checkItemExists(uuid) {
	return new Promise((resolve, reject) => {
		queryItemsInDatabase(uuid)
			.then(item => {
				if(item.Count > 0) {
					resolve(item.Items[0]);
				}

				resolve(false)
			})
			.catch(err => reject(false));
	});
}

function checkAndGetItem(uuid, lang) {
	return new Promise((resolve, reject) => {
		//TODO: check lastPubDate
		return BUCKET.get(uuid)
				.then(data => {
					if(JSON.parse(data)[lang]) {
						resolve(data);
					} else {
						resolve(false);
					}

				})
				.catch(err => {
					if(err.statusCode === 404){
						resolve(false);
					} else {
						reject(err);
					}
				});
	});
}

async function cacheTranslation({ uuid, lang, lastPubDate, translation, translator }) {
	const params = {
		TableName: cacheTable,
		Key: {
			uuid: `${uuid}_${translator}`
		},
		ReturnValues: 'ALL_NEW'
	};

	const translationData = {
		lastPubDate: lastPubDate
	};
	translationData[`${lang.toLowerCase()}`] = translation;

	const checkExisting = await checkItemExists(`${uuid}_${translator}`);

	const updateType = getLatest(lastPubDate, checkExisting.lastPubDate)?'update':'override';

	return new Promise ((resolve, reject) => {
		BUCKET.save(`${uuid}_${translator}`, translationData, updateType)
			.then(data => {
				params.UpdateExpression = getUpdateExpression(updateType);
				params.ExpressionAttributeValues = {
					':lastPubDate': lastPubDate,
					':lang': database.createSet([`${lang.toLowerCase()}`]),
					':etag': data.ETag
				};

				database.update(params, (error, result) => {
					if (error) {
						reject(error);
					}
					resolve(result);
				});
			})
			.catch(err => {
				console.log('There was an error creating or updating the file');
			});
	});
}

function getUpdateExpression(updateType) {
	let expression = 'SET lastPubDate = :lastPubDate, S3_ETag = :etag';
	if (updateType === 'update') {
		expression += ' ADD langs :lang';
	} else if (updateType === 'override') {
		expression += ', langs = :lang';
	}

	return expression;
}

module.exports = {
	exists    : checkItemExists,
	update    : cacheTranslation,
	checkAndGet: checkAndGetItem 
};

const AWS = require('aws-sdk');

const cacheTable = process.env.CACHE_TABLE;
const region = process.env.AWS_REGION;

const database = new AWS.DynamoDB.DocumentClient({ region });
const BUCKET = require('./translation-cache-bucket');

async function queryItemsInDatabase(uuid){
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
				console.log('ERR::', err);
				reject(err);
			} else {
				console.log('DATA::', data);
				resolve(data);
			}
		});
	});
}

async function checkItemExists(uuid) {
	const item = await queryItemsInDatabase(uuid);

	if(item.Count > 0) {
		return item.Items[0];
	}

	return false;
}

function cacheTranslation({ uuid, lang, lastPubDate, translation }) {
	const params = {
		TableName: cacheTable,
		Key: {
			uuid: uuid
		},
		ReturnValues: 'ALL_NEW'
	};

	const translationData = {
		lastPubDate: lastPubDate
	};
	translationData[`${lang.toLowerCase()}`] = translation;

	return new Promise ((resolve, reject) => {
		BUCKET.save(uuid, translationData)
			.then(data => {
				console.log('DATA HERE::', data);
				params.UpdateExpression = `SET lastPubDate = :lastPubDate, lang_${lang.toLowerCase()} = :lang, S3_ETag = :etag`;
				params.ExpressionAttributeValues = {
					':lastPubDate': lastPubDate,
					':lang': true,
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

module.exports = {
	exists    : checkItemExists,
	update    : cacheTranslation
};

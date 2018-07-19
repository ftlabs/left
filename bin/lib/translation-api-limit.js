const AWS = require('aws-sdk');

const limitTable = process.env.LIMIT_TABLE;
const awsRegion = process.env.AWS_REGION;

const apiLimits = {
	deepl: process.env.DEEPL_API_LIMIT,
	google: process.env.GOOGLE_API_LIMIT
};

const database = new AWS.DynamoDB.DocumentClient({ region: awsRegion });

function monthCreate({ month, year }) {
	return new Promise((resolve, reject) => {
		const params = {
			TableName: limitTable,
			Item: {
				year,
				month,
				createdAt: Date.now(),
				updatedAt: Date.now()
			}
		};

		Object.keys(apiLimits).forEach(provider => {
			params.Item[provider] = 0;
		});

		database.put(params, (error, result) => {
			if (error) {
				reject(error);
			}
			resolve(result);
		});
	});
}

function withinApiLimit({ provider }) {
	return new Promise((resolve, reject) => {
		if (!apiLimits[provider]) {
			reject(new Error('API provider does not exist'));
		}

		const month = new Date().getMonth();
		const year = new Date().getYear();

		const params = {
			TableName: limitTable,
			Key: {
				month,
				year
			}
		};

		database.get(params, async (error, result) => {
			if (error) {
				reject(error);
				return;
			}

			if (Object.keys(result).length === 0) {
				try {
					await monthCreate({ month, year });
					resolve(true);
				} catch (error) {
					reject(error);
				}
				return;
			}

			result.Item[provider] >= apiLimits[provider]
				? resolve(false)
				: resolve(true);
		});
	});
}

function updateApiLimitUsed({ articleCharacters, provider }) {
	return new Promise((resolve, reject) => {
		if (!apiLimits[provider]) {
			reject(new Error('API provider does not exist'));
			return;
		}

		const month = new Date().getMonth();
		const year = new Date().getYear();

		const params = {
			TableName: limitTable,
			Key: {
				month,
				year
			},
			ExpressionAttributeValues: {
				':articleCharacters': articleCharacters,
				':updatedAt': Date.now()
			},
			UpdateExpression: `SET updatedAt = :updatedAt ADD ${provider} :articleCharacters`,
			ReturnValues: 'ALL_NEW'
		};

		database.update(params, (error, result) => {
			if (error) {
				reject(error);
			}
			resolve(result);
		});
	});
}

module.exports = {
	withinApiLimit,
	updateApiLimitUsed
};

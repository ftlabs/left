const AWS = require('aws-sdk');
const Utils = require('../utils/utils');

const limitTable = Utils.processEnv('LIMIT_TABLE');
const region     = Utils.processEnv('AWS_REGION');
const apiLimits  = Utils.processEnv('API_CHAR_LIMITS', {validateJson: true});

const database = new AWS.DynamoDB.DocumentClient({ region });

function monthCreate(month, year) {
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

function withinApiLimit(providers) {
	return new Promise((resolve, reject) => {
		if (!validProviders(providers)) {
			reject(new Error('API provider does not exist'));
		}

		const { month, year } = getCurrentDate();

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
					await monthCreate(month, year);
					resolve(true);
				} catch (error) {
					reject(error);
				}
				return;
			}

			let limitsReached = {};

			providers.forEach(provider => {
				limitsReached[provider] = result.Item[provider] < parseInt(apiLimits[provider]);
			});

			resolve(limitsReached);
		});
	});
}

function updateApiLimitUsed(translators, charLength) {
	return new Promise((resolve, reject) => {
		if (!validProviders(translators)) {
			reject(new Error('API provider does not exist'));
			return;
		}

		const { month, year } = getCurrentDate();

		const params = {
			TableName: limitTable,
			Key: {
				month,
				year
			},
			ReturnValues: 'ALL_NEW'
		};
		params.ExpressionAttributeValues = constructAttributeValues(translators, charLength);
		params.UpdateExpression = constructUpdateExpression(translators);

		database.update(params, (error, result) => {
			if (error) {
				reject(error);
			}
			resolve(result);
		});
	});
}

function constructUpdateExpression(translators) {
	let updateExpression = 'SET updatedAt = :updatedAt ADD ';

	for (let i = 0; i < translators.length; ++i) {
		updateExpression = updateExpression + `${i === 0 ? '' : ','} ${translators[i]} :${translators[i]}`;
	}

	return updateExpression;
}

function constructAttributeValues(translators, charLength) {
	let attributeValues = {
		':updatedAt': Date.now()
	};

	for (let i = 0; i < translators.length; ++i){
		attributeValues[`:${translators[i]}`] = charLength;
	}

	return attributeValues;
}

function validProviders(providers) {
	return providers.reduce(
		provider => (apiLimits[provider] ? false : true),
		true
	);
}

function getCurrentDate() {
	return {
		month: new Date().getMonth(),
		year: new Date().getFullYear()
	};
}

module.exports = {
	withinApiLimit,
	updateApiLimitUsed
};

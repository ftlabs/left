const AWS = require('aws-sdk');

const limitTable = process.env.LIMIT_TABLE;
const region = process.env.AWS_REGION;

const apiLimits = {
	deepl: process.env.DEEPL_API_LIMIT,
	google: process.env.GOOGLE_API_LIMIT
};

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
				limitsReached[provider] = result.Item[provider] >= apiLimits[provider];
			});

			resolve(limitsReached);
		});
	});
}

function updateApiLimitUsed(articleCharacters) {
	return new Promise((resolve, reject) => {
		if (!validProviders(Object.keys(articleCharacters))) {
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
		params.ExpressionAttributeValues = constructAttributeValues(
			articleCharacters
		);
		params.UpdateExpression = constructUpdateExpression(articleCharacters);

		database.update(params, (error, result) => {
			if (error) {
				reject(error);
			}
			resolve(result);
		});
	});
}

function constructUpdateExpression(articleCharacters) {
	let updateExpression = 'SET updatedAt = :updatedAt ADD ';

	Object.keys(articleCharacters).forEach((provider, index) => {
		updateExpression =
			updateExpression + `${index === 0 ? '' : ','} ${provider} :${provider}`;
	});

	return updateExpression;
}

function constructAttributeValues(articleCharacters) {
	let attributeValues = {
		':updatedAt': Date.now()
	};

	Object.keys(articleCharacters).forEach(provider => {
		attributeValues[`:${provider}`] = articleCharacters[provider];
	});

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

(async () => {
	try {
		const data = await updateApiLimitUsed({
			google: 50,
			deepl: 75
		});
		console.log(data);
	} catch (error) {
		console.log(error);
	}
})();

(async () => {
	try {
		const data = await withinApiLimit(['deepl', 'google']);
		console.log('resolved', data);
	} catch (error) {
		console.log('rejected', error);
	}
})();

module.exports = {
	withinApiLimit,
	updateApiLimitUsed
};

const AWS = require('aws-sdk');

const limitTable = process.env.LIMIT_TABLE;
const region = process.env.AWS_REGION;

const translators = [
	...process.env.RESTRICTED_TRANSLATORS.split(','),
	...process.env.PUBLIC_TRANSLATORS.split(',')
];

const database = new AWS.DynamoDB.DocumentClient({ region });

const apiLimits = (() => {
	const limits = {};
	translators.forEach(translator => {
		const limit = process.env[`${translator.toUpperCase()}_API_LIMIT`];
		if (!limit) {
			throw new Error(
				`${translator} does not have an api limit specified as an environment variable`
			);
		}
		limits[translator] = limit;
	});
	return limits;
})();

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

module.exports = {
	withinApiLimit,
	updateApiLimitUsed
};

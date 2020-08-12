const { isNil } = require("lodash");
const { envError } = require("./errors");
const keys = {
	APP_PORT: "APP_PORT",
	REDIS_PORT: "REDIS_PORT",
	REDIS_HOST: "REDIS_HOST",
	NODE_ENV: "NODE_ENV",
	MASTER_NODE: "MASTER_NODE",
	MONGO_URI: "MONGO_URI",
	SENDGRID_API_KEY: "SENDGRID_API_KEY",
	TEST_EMAIL: "TEST_EMAIL",
};
const env = {
	appPort: process.env[keys.APP_PORT],
	redisPort: process.env[keys.REDIS_PORT],
	redisHost: process.env[keys.REDIS_HOST],
	isMaster: process.env[keys.MASTER_NODE] === "true",
	mongoUrl: process.env[keys.MONGO_URI],
	sendGridApiKey: process.env[keys.SENDGRID_API_KEY],
	testEmail: process.env[keys.TEST_EMAIL],
};

const checkEnvironments = () => {
	for (const [key, value] of Object.entries(env)) {
		console.log(`${key} = ${value}`);
		if (isNil(key)) throw envError;
	}
};
module.exports = {
	env,
	checkEnvironments,
};

checkEnvironments();

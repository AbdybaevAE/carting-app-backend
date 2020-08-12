const UPDATE_REDIS_CHANNEL = "update-span";
const UPDATE_TOTAL_COUNT_CHANNEL = "update-total-count";
const EMAIL_CHANNEL = "email";
const REDIS_CLI_ASYNC_COMMANDS = [
	"get",
	"set",
	"json_get",
	"json_set",
	"json_del",
	"zadd",
	"zrank",
	"zrange",
	"del",
	"publish",
	"subscribe",
	"flushall",
];

module.exports = {
	UPDATE_REDIS_CHANNEL,
	REDIS_CLI_ASYNC_COMMANDS,
	UPDATE_TOTAL_COUNT_CHANNEL,
	EMAIL_CHANNEL,
};

const { promisify } = require("util");
const rejson = require("redis-rejson");
const redis = require("redis");
rejson(redis);
const _ = require("lodash");
const RedlockClass = require("redlock");
const { PageAdapter } = require("./span");
const { env } = require("./config");
const { isNil } = require("lodash");
const {
	UPDATE_REDIS_CHANNEL,
	REDIS_CLI_ASYNC_COMMANDS,
	UPDATE_TOTAL_COUNT_CHANNEL,
	EMAIL_CHANNEL,
} = require("./constants");

const key_users_count = "users:count";
const key_user_data = (userId) => `users:${userId}:data`;
const key_active_span = (span) => `intervals:active:${span.getHash()}`;
const key_user_sequence = "users:sequence";
const key_cache_initialized = "cache_initialized";

const lock_users_count = "locks:users_count";
const lock_users_sequence = "locks:sequence";

class CacheManager {
	constructor(dbAdapter) {
		const client = redis.createClient(env.redisPort, env.redisHost);
		this.client = client;
		this.asyncClient = REDIS_CLI_ASYNC_COMMANDS.reduce(
			(prev, commandName) => ({
				...prev,
				[commandName]: promisify(client[commandName]).bind(client),
			}),
			{}
		);
		this.dbAdapter = dbAdapter;
		this.hasDbConnection = dbAdapter != null;
		this.redlock = new RedlockClass([client], {
			driftFactor: 0.01, // time in ms
			retryCount: 10,
			retryDelay: 200, // time in ms
			retryJitter: 200, // time in ms
		});
	}
	jsonToString(json) {
		return JSON.stringify(json);
	}
	stringToJson(str) {
		return JSON.parse(str);
	}
	async lockKey(key, ttl = 1000) {
		return this.redlock.lock(key, ttl);
	}
	async setJson(key, json) {
		return this.asyncClient.json_set(key, ".", this.jsonToString(json));
	}
	async getJson(key) {
		return this.stringToJson(await this.asyncClient.json_get(key));
	}
	async delJson(key) {
		return this.asyncClient.json_del(key);
	}
	async createUserEvent(user) {
		try {
			await this.initUserData(user);
			await this.updateUserTimeEvent(user);
			await this.pushTotalCountUpdate(await this.dbAdapter.count());
		} catch (e) {
			console.error(e);
		}
	}
	async updateUserTimeEvent(user) {
		try {
			const userId = user._id.toString();
			const userTime = user.time;
			user._id = user._id.toString();
			let {
				oldPosition,
				newPosition,
			} = await this.updateUserSequence(userId, userTime);
			if (oldPosition == null) oldPosition = await this.dbAdapter.count();
			const p1 = PageAdapter.getPageNumberByPoint(newPosition);
			const p2 = PageAdapter.getPageNumberByPoint(oldPosition);
			const min = Math.min(p1, p2);
			const max = Math.max(p1, p2);
			const spans = [];
			for (let page = min; page <= max; page++) {
				spans.push(PageAdapter.createSpanFromPage(page));
			}
			await Promise.all(spans.map(this.delSpan.bind(this)));
			spans.forEach(this.produceRefreshSpanMessage.bind(this));
		} catch (e) {
			console.error(e);
		}
	}
	async initUserData(user) {
		const userId = user._id.toString();
		await this.setJson(key_user_data(userId), user);
		const locker = await this.lockKey(lock_users_count);
		const usersCount = Number(await this.asyncClient.get(key_users_count));
		await this.asyncClient.set(key_users_count, usersCount + 1);
		await locker.unlock();
	}
	async getUsersCount() {
		return Number(await this.asyncClient.get(key_users_count));
	}

	async verifyCache() {
		// await this.asyncClient.set(key_cache_initialized, "false");
		if (!env.isMaster || !this.hasDbConnection) {
			console.warn(
				"Cannot verify cache due to isMaster = %s, hasDbconnection = %s ...",
				env.isMaster,
				this.hasDbConnection
			);
			return;
		}
		const cacheInitialized =
			(await this.asyncClient.get(key_cache_initialized)) === "true";
		if (!cacheInitialized) await this.initAllCacheData();
	}
	async delSpan(span) {
		return this.delJson(key_active_span(span));
	}
	async updateUserData(user) {
		return this.setJson(key_user_data(user._id.toString()), user);
	}

	async getSpanUsers(span) {
		const items = await this.getJson(key_active_span(span));
		if (!isNil(items)) {
			return items;
		}
		console.log("init users for span %s", span.getHash());
		return this.buildSpanUsers(span);
	}
	async updateUserSequence(userId, time = 0) {
		const locker = await this.lockKey(lock_users_sequence);
		const oldPosition = await this.asyncClient.zrank(
			key_user_sequence,
			userId
		);
		await this.asyncClient.zadd(key_user_sequence, time, userId);
		const newPosition = await this.asyncClient.zrank(
			key_user_sequence,
			userId
		);
		const res = {
			newPosition,
		};
		await this.notifyInCase(newPosition);
		await locker.unlock();

		if (oldPosition != null) res.oldPosition = oldPosition;
		return res;
	}
	async notifyInCase(newPosition) {
		try {
			if (newPosition !== 0) return;
			const userIds = await this.asyncClient.zrange(
				key_user_sequence,
				0,
				1
			);
			if (userIds.length !== 2) return;
			const newWinner = await this.asyncClient.json_get(
				key_user_data(userIds[0])
			);
			const oldWinner = await this.asyncClient.json_get(
				key_user_data(userIds[1])
			);
			if (isNil(oldWinner) || isNil(newWinner)) return;
			const message = [newWinner, oldWinner].join("|");
			this.pushToEmailChannel(message);
		} catch (e) {
			console.error(e);
		}
	}
	async computeSpanUsers(span) {
		const { start, end } = span.getBounds();
		const ids = await this.asyncClient.zrange(
			key_user_sequence,
			start,
			end
		);
		return Promise.all(
			ids.map((usedId) => this.getJson(key_user_data(usedId)))
		);
	}
	async buildSpanUsers(span) {
		const result = await this.computeSpanUsers(span);
		const users = this.jsonToString(result);
		this.setJson(key_active_span(span), users);
		return users;
	}
	produceRefreshSpanMessage(span) {
		return this.pushToUpdatesQueue(span.getHash());
	}

	pushToUpdatesQueue(message) {
		this.client.publish(UPDATE_REDIS_CHANNEL, message);
	}
	pushTotalCountUpdate(message) {
		this.client.publish(UPDATE_TOTAL_COUNT_CHANNEL, message);
	}
	pushToEmailChannel(message) {
		this.client.publish(EMAIL_CHANNEL, message);
	}
	async initAllCacheData() {
		console.log("start init cache...");
		const that = this;
		const deleteAllKeys = async () => await this.asyncClient.flushall();
		const setAllUsersData = async (allUsers) => {
			await this.asyncClient.set(key_users_count, allUsers.length);
			await Promise.all(
				allUsers.map((user) =>
					that.setJson(key_user_data(user._id.toString()), user)
				)
			);
			await Promise.all(
				allUsers.map((user) =>
					that.asyncClient.zadd(
						key_user_sequence,
						user.time,
						user._id.toString()
					)
				)
			);
		};
		const setAllAdditionalData = async () => {
			await this.asyncClient.set(key_cache_initialized, "true");
		};
		const allUsers = await this.dbAdapter.find({});

		await deleteAllKeys();
		await setAllUsersData(allUsers);
		await setAllAdditionalData();
		console.log("successfully initialized cache...");
	}
}
module.exports = { CacheManager };

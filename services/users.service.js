"use strict";

const DbMixin = require("../mixins/db.mixin");
const { generateUsers } = require("../lib/mock-data");
const Joi = require("joi");
const { invalidBody, notFound, serverInternalError } = require("../lib/errors");
const { SuccessResponse, CreatedResponse } = require("../lib/response");
const { CacheManager } = require("../lib/cache-manager");
const config = require("../lib/config");
/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "users",
	mixins: [DbMixin("users")],
	actions: {
		createUser: {
			async handler(ctx) {
				try {
					const schema = Joi.object({
						email: Joi.string().email().required(),
						username: Joi.string().required(),
						time: Joi.number().optional().min(1),
					});

					const { error, value } = schema.validate(ctx.params, {
						stripUnknown: true,
					});
					if (error) return invalidBody;
					const user = await this.adapter.insert(value);
					await this.cacheManager.createUserEvent(user);
					return CreatedResponse();
				} catch (e) {
					console.error(e);
					return serverInternalError;
				}
			},
		},
		updateUserTime: {
			async handler(ctx) {
				try {
					const schema = Joi.object({
						userId: Joi.string().required(),
						time: Joi.number().required().min(1),
					});
					const { error, value } = schema.validate(ctx.params, {
						stripUnknown: true,
					});
					if (error) return invalidBody;
					const user = await this.adapter.updateById(value.userId, {
						$set: {
							time: value.time,
						},
					});
					if (!user) return notFound;
					await this.cacheManager.updateUserData(user);
					await this.cacheManager.updateUserTimeEvent(user);
					return SuccessResponse();
				} catch (e) {
					console.error(e);
					return serverInternalError;
				}
			},
		},
	},

	methods: {
		async seedDB() {},
	},
	async afterConnected() {
		const count = await this.adapter.count();
		if (count === 0 && config.env.isMaster) {
			await this.adapter.insertMany(generateUsers());
		}
	},
	async started() {
		this.cacheManager = new CacheManager(this.adapter);
		await this.cacheManager.verifyCache();
	},
};

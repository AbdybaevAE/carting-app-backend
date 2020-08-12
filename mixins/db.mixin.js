"use strict";

const fs = require("fs");
const mkdir = require("mkdirp").sync;

const DbService = require("moleculer-db");
const { adapter } = require("moleculer-db");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = function (collection) {
	const cacheCleanEventName = `cache.clean.${collection}`;

	const schema = {
		mixins: [DbService],
		events: {
			async [cacheCleanEventName]() {
				if (this.broker.cacher) {
					await this.broker.cacher.clean(`${this.fullName}.*`);
				}
			},
		},

		methods: {
			async entityChanged(type, json, ctx) {
				ctx.broadcast(cacheCleanEventName);
			},
		},
		
	};
	const MongoAdapter = require("moleculer-db-adapter-mongo");

	schema.adapter = new MongoAdapter(process.env.MONGO_URI);
	schema.collection = collection;

	return schema;
};

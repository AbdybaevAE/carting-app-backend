const io = require("socket.io");
const { Span, PageAdapter } = require("./span");
const { CacheManager } = require("./cache-manager");
const redis = require("redis");
const { env } = require("./config");
const { SocketTracker } = require("./socket-tracker");
const { isNil } = require("lodash");
const {
	UPDATE_REDIS_CHANNEL,
	UPDATE_TOTAL_COUNT_CHANNEL,
} = require("./constants");
class SocketManager {
	constructor(server) {
		this.socketTracker = new SocketTracker();
		this.subscriber = redis.createClient(env.redisPort, env.redisHost);
		this.cacheManager = new CacheManager();
		this.initCacheMessages();
		this.initIo(server);
	}
	initIo(server) {
		this.io = io(server);
		this.io.on("connection", (socket) => {
			this.socketTracker.addSocket(socket);
			socket.on("setPage", this.onSetPage(socket));
			socket.on("disconnect", this.onDisconnect(socket));
		});
	}
	onSetPage(socket) {
		return (message = { data: -1 }) => {
			try {
				const span = PageAdapter.createSpanFromPage(message.data);
				this.leaveSpan(socket);
				this.joinSpan(socket, span);
				this.emitJoinData(socket);
			} catch (e) {
				console.error(e);
			}
		};
	}
	joinSpan(socket, span) {
		socket.span = span;
		socket.join(socket.span.getHash());
		this.socketTracker.joinSpan(socket, span);
	}
	onDisconnect(socket) {
		return () => {
			this.socketTracker.onDisconnect(socket);
		};
	}
	leaveSpan(socket) {
		const { span: currentSpan } = socket;
		if (!isNil(currentSpan)) {
			socket.leave(currentSpan.getHash());
			this.socketTracker.leaveSpan(socket);
		}
	}
	async emitJoinData(socket) {
		try {
			const { span } = socket;
			const users = await this.cacheManager.getSpanUsers(span);
			const usersTotalCount = await this.cacheManager.getUsersCount();
			const pagesTotalCount = PageAdapter.getPageNumberByPoint(
				usersTotalCount - 1
			);
			socket.emit("joinResponse", {
				isSuccess: true,
				data: users,
				meta: {
					totalCount: pagesTotalCount,
					span: span.getBounds(),
				},
			});
		} catch (e) {
			console.error(e);
		}
	}
	async initCacheMessages() {
		this.subscriber.subscribe(UPDATE_REDIS_CHANNEL);
		this.subscriber.subscribe(UPDATE_TOTAL_COUNT_CHANNEL);
		this.subscriber.on("message", this.redisSubscriber.bind(this));
	}
	async redisSubscriber(channel, message) {
		switch (channel) {
			case UPDATE_REDIS_CHANNEL:
				this.onRefreshSpan(message);
				break;
			case UPDATE_TOTAL_COUNT_CHANNEL:
				this.onTotalCount(message);
				break;
			default:
				console.error("wrong channel...");
		}
	}
	onTotalCount(message) {
		try {
			const usersTotalCount = Number(message);
			const pagesTotalCount = PageAdapter.getPageNumberByPoint(
				usersTotalCount - 1
			);
			this.io.emit("total-count", {
				isSuccess: true,
				data: pagesTotalCount,
			});
		} catch (e) {
			console.error(e);
		}
	}
	async onRefreshSpan(message) {
		try {
			const span = Span.createFromHash(message);
			if (!this.socketTracker.hasSocketsInSpan(span))
				return console.log("has no socket for span %s", span.getHash());
			await this.emitRefreshSpan(span);
		} catch (e) {
			console.error(e);
		}
	}
	async emitRefreshSpan(span) {
		const users = await this.cacheManager.getSpanUsers(span);
		this.io.sockets.in(span.getHash()).emit("update-list", {
			isSuccess: true,
			data: users,
			meta: {
				totalCount: 10000,
				span: span.getBounds(),
			},
		});
	}
	getIo() {
		return this.io;
	}
}
module.exports = { SocketManager };

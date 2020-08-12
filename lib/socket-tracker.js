const { isNil } = require("lodash");
class SocketTracker {
	constructor() {
		this.sockets = new Map();
		this.spans = new Map();
		this.spanVersion = new Map();
		// this.printSockets();
	}
	
	addSocket(socket) {
		this.sockets.set(socket.id, socket);
	}
	onDisconnect(socket) {
		this.leaveSpan(socket);
		this.sockets.delete(socket.id, socket);
	}
	leaveSpan(socket) {
		const socketId = socket.id;
		const span = socket.span;
		if (isNil(span) || !this.spans.get(span.getHash())) return;
		this.spans.get(span.getHash()).delete(socketId);
	}
	getSpanSockets(span) {
		return this.spans.get(span.getHash());
	}
	hasSpan(span) {
		return this.spans.has(span.getHash());
	}
	hasSocketsInSpan(span) {
		return this.hasSpan(span) && this.getSpanSockets(span).size !== 0;
	}
	initSpan(span) {
		return this.spans.set(span.getHash(), new Set());
	}
	joinSpan(socket, span) {
		if (isNil(span)) return console.warn("wrong span...");
		if (!this.hasSpan(span)) this.initSpan(span);
		this.getSpanSockets(span).add(socket.id);
	}
	delSpan(span) {
		return this.spans.delete(span.getHash());
	}

}
module.exports = {
	SocketTracker,
};

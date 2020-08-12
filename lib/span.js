const itemsPerPage = 10;
const invalidPageNumber = new Error("invalidPageNumber");
const invalidStringSpan = new Error("invalidStringSpan");
class PageAdapter {
	static getBounds(page = 0) {
		if (page <= 0) throw invalidPageNumber;
		const end = page * itemsPerPage - 1;
		const start = (page - 1) * itemsPerPage;
		return { start, end };
	}
	static getHash(page) {
		const { start, end } = PageAdapter.getBounds(page);
		return Span.getHash(start, end);
	}
	static createSpanFromPage(page = -1) {
		const { start, end } = PageAdapter.getBounds(page);
		return new Span(start, end);
	}
	static getPageNumberByPoint(point = -1) {
		return Math.trunc(point / itemsPerPage) + 1;
	}
}
class Span {
	constructor(start, end) {
		this.start = start;
		this.end = end;
	}
	static createFromHash(str = "") {
		const ars = String(str).split(":");
		if (ars.length != 3) throw invalidStringSpan;
		const start = Number(ars[1]);
		const end = Number(ars[2]);
		if (isNaN(start) || isNaN(end) || start > end) throw invalidStringSpan;
		return new Span(start, end);
	}
	static createFromArray([start, end]) {
		return new Span(start, end);
	}
	static createFromPoint(point = -1) {
		point = Number(point);
		if (point < 0) throw new Error("Wrong point");
		return PageAdapter.createSpanFromPage(
			Math.trunc(point / itemsPerPage) + 1
		);
	}
	static getHash(start, end) {
		return `span:${start}:${end}`;
	}
	getBounds() {
		return {
			start: this.start,
			end: this.end,
		};
	}
	getHash() {
		return Span.getHash(this.start, this.end);
	}
}

module.exports = { Span, PageAdapter };

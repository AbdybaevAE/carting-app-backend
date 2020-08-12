const GetIntervalsToUpdate = (intervals, num) => {
	let n = intervals.length;
	const res = [];
	for (let i = 0; i < n; i++) {
		const [start, end] = intervals[i];
		if (num < start) return res;
		if (num > end) continue;
		res.push(intervals[i]);
		num = end + 1;
	}
	return res;
};

const GetSpansByPoints = (spans = [], points = []) => {
	if (!Array.isArray(spans)) return [];
	let m = points.length;
	let n = spans.length;
	if (m == 0 || n == 0) return [];
	const solution = new Array(n).fill(false);
	for (let i = 0; i < m; i++) {
		let currVal = points[i];
		for (let j = 0; j < n; j++) {
			const { start, end } = spans[j].getBounds();
			if (currVal < start) break;
			if (currVal > end) continue;
			if (solution[j]) break;
			solution[j] = true;
			currVal = end + 1;
		}
	}
	return spans.filter((_, index) => solution[index]);
};
const SortIntervals = (intervals = []) => intervals.sort((a, b) => a[0] - b[0]);
const IsExistIntervalForNumber = (intervals = [], num = -1) => {
	let n = intervals.length;
	for (let i = 0; i < n; i++) {
		const [start, end] = intervals[i];
		if (start > num) return false;
		if (num >= start && num <= end) return true;
	}
	return false;
};

const AddInterval = (interval, intervals) => {
	intervals.push(intervals);
	SortIntervals(intervals);
};
const DeleteInterval = (interval, intervals) => {
	const index = intervals.map(([start]) => start).indexOf(interval[0]);
	if (~index) {
		intervals.splice(index, 1);
	}
	return intervals;
};

module.exports = {
	GetSpansByPoints,
	DeleteInterval,
	AddInterval,
	GetIntervalsToUpdate,
	SortIntervals,
	IsExistIntervalForNumber
};

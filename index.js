module.exports = {
	Tracker: require ('./lib/Tracker.js'),
	formatElapsed: o => new (require ('./lib/format/Elapsed.js')) (o),
}
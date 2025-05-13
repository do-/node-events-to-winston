module.exports = {
	Tracker: require ('./lib/Tracker.js'),
	formatDetails: o => new (require ('./lib/format/Details.js')) (o),
	formatElapsed: o => new (require ('./lib/format/Elapsed.js')) (o),
	formatPhase:   o => new (require ('./lib/format/Phase.js')) (o),
}
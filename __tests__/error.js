const {createLogger, format, transports} = require ('winston')
const EventEmitter = require ('events')
const {Tracker} = require ('..')
const {Writable} = require ('stream')


test ('basic', async () => {

	let s = ''

	const logger = createLogger ({
		transports: [new transports.Stream ({stream: new Writable ({write (r) {s += r.toString ()}})})],
		format: format.printf (({level, message}) => `${level} ${message}`)
	})
	
	const emitter = new EventEmitter ()
	const tracker = new Tracker (emitter, logger)

	tracker.listen ()

	emitter.emit ('error', Error ('TEST'))

	expect (s.split ('\n') [0].trim ()).toBe ('error Error: TEST')

})

test ('rewrite', async () => {

	let s = ''

	const logger = createLogger ({
		transports: [new transports.Stream ({stream: new Writable ({write (r) {s += r.toString ()}})})],
		format: format.printf (({level, message}) => `${level} ${message}`)
	})
	
	const emitter = new EventEmitter ()
	const tracker = new Tracker (emitter, logger, {events: {
		error: {level: 'info'}
	}})

	tracker.listen ()

	emitter.emit ('error', Error ('TEST'))

	expect (s.split ('\n') [0].trim ()).toBe ('info Error: TEST')

})
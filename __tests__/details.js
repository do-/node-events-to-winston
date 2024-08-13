const {createLogger, format, transports, level, stream} = require ('winston')
const EventEmitter = require ('events')
const {Tracker} = require ('..')
const {Writable} = require ('stream')

class MyClass extends EventEmitter {

	constructor (o = {}) {
		super ()
		for (const k in o) this [k] = o [k]
	}

	get [Tracker.LOGGING_ID] () {
		return this.id
	}

	get [Tracker.LOGGING_PARENT] () {
		return this.parent
	}

	get [Tracker.LOGGING_DETAILS] () {
		return {
			id: this.id
		}
	}

}

class MySubClass extends MyClass {

	get [Tracker.LOGGING_DETAILS] () {
		return {
			...super [Tracker.LOGGING_DETAILS],
			flag: 'A',
			label: 5,
		}
	}

}

test ('details', () => {

	let s = ''

	const stream = new Writable ({
		write (r, _, cb) {
			s += r.toString ()
			cb ()
		}
		
	})

	const logger = createLogger ({
		transports: [
//			new transports.Console (),
			new transports.Stream ({stream}),
		],
		format: format.printf (({message, details}) => `${details.flag}${message}${JSON.stringify(details)}`)
	})
	
	const emitter = new MySubClass ({
		id: 1,
		parent: new MyClass ({id: 'root'})
	})

	const tracker = new Tracker (emitter, logger, {
		events: {
			progress: {
				level: 'info',
				message: v => v,
				details: {label: undefined}
			},
		}
	})

	tracker.listen ()

	emitter.emit ('progress', 50)

	expect (s.trim ()).toBe ('A50{\"id\":1,\"flag\":\"A\"}')

})
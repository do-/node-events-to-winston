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

	get [Tracker.LOGGING_EVENTS] () {
		return {
			progress: {
				level: 'info',
				message: v => v + '%',
			},
		}
	}




}

test ('bad', () => {

	const logger = createLogger ({
		transports: [
			new transports.Console (),
		],
	})

	expect (() => new Tracker ()).toThrow ('emitter')
	expect (() => new Tracker (0)).toThrow ('emitter')
	expect (() => new Tracker (new EventEmitter ())).toThrow ('logger')
	expect (() => new Tracker (new EventEmitter (), 0)).toThrow ('logger')

	expect (() => new Tracker (new EventEmitter (), logger, {
		events: {
			start: {
				message: 0,
			}
		}
	})).toThrow ('message')

	expect (() => new Tracker (new EventEmitter (), logger, {
		events: {
			start: {
				details: 0,
			}
		}
	})).toThrow ('details')

})

test ('label', () => {

	const logger = createLogger ({
		transports: [
			new transports.Console (),
		],
	})

	const emitter = new MyClass ({
		id: 1,
		parent: new MyClass ({})
	})

	{

		const tracker = new Tracker (emitter, logger)

		expect (tracker.id).toBe ('1')
		expect (tracker.getInfo ('?')).toBeNull ()
	
	}

	{

		const tracker = new Tracker (emitter, logger, {id: 5})

		expect (tracker.id).toBe ('5')
	
	}

})


test ('basic', () => {

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
		format: format.printf (({level, id, message, details, elapsed}) => `${level} ${id} ${message}${details??''} ${elapsed??''}`)
	})
	
	const emitter = new MyClass ({
		id: 1,
		parent: new MyClass ({id: 'root'})
	})

	const tracker = new Tracker (emitter, logger, {
		events: {
			start: {
				level: 'info',
				message: '>',
				details: function (payload) {return this.id + payload}
			},
			finish: {
				level: 'info',
				message: '<',
				elapsed: true,
			},
		}
	})

	tracker.listen ()

	emitter.emit ('start', 'a')
	emitter.emit ('progress', 50)
	emitter.emit ('finish')

	tracker.unlisten ()

	emitter.emit ('start')
	emitter.emit ('finish')

	const a = s.trim ().split ('\n').map (s => s.trim ())

	expect (a).toHaveLength (3)
	expect (a [0]).toBe ('info root/1 >1a')
	expect (a [1]).toBe ('info root/1 50%')
	expect (a [2].slice (0, 13)).toBe ('info root/1 <')
	expect (parseInt (a [2].slice (13)) >= 0).toBe (true)

})
const EventEmitter     = require ('events')
const winston          = require ('winston')
const {ObjectMerger}   = require ('subclassable-object-merger')

const LOGGING_EVENTS = Symbol ('events')
const LOGGING_ID     = Symbol ('id')
const LOGGING_PARENT = Symbol ('parent')

const OM = new ObjectMerger ({override: ['scalar']})

class Tracker {

	static LOGGING_ID = LOGGING_ID
	static LOGGING_PARENT = LOGGING_PARENT
	static LOGGING_EVENTS = LOGGING_EVENTS

	constructor (emitter, logger, options = {}) {

		if (emitter == null) throw Error ('`emitter` not defined')
		if (!(emitter instanceof EventEmitter)) throw Error ('The `emitter` option must be an EventEmitter')

		if (logger == null) throw Error ('`logger` not defined')
		if (!(logger instanceof winston.Logger)) throw Error ('The `logger` option must be a winston.Logger')

		this.start = Date.now ()

		this.emitter = emitter
		this.logger  = logger

		OM.merge (options,        this.getDefaultOptions ())

		if (LOGGING_EVENTS in emitter) OM.merge (options.events, emitter [LOGGING_EVENTS])

		OM.merge (options.events, this.getDefaultEvents  ())

		for (const [event, o] of Object.entries (options.events)) {

			if (o.message == null) o.message = event

			if (typeof o.message !== 'function' && typeof o.message !== 'string') throw Error (`Invalid message for ${event}: ${o.message}`)

			if (o.details != null && typeof o.details !== 'function') throw Error (`Invalid details for ${event}: ${o.details}`)

		}

		for (const k in options) this [k] = options [k]

		this.id = this.getId ()

	}

	getDefaultOptions () {

		return {
			sep: '/',
			maxPathLength: 100,
			events: {},
		}

	}

	getId () {

		if (this.id != null) return String (this.id)

		const path = this.getPath (); if (path == null) return null

		return path.join (this.sep)

	}

	getPath () {

		const {emitter} = this; if (!(LOGGING_ID in emitter)) return null

		const path = []

		for (let o = emitter; o != null && path.length < this.maxPathLength; o = o [LOGGING_PARENT]) {

			const id = o [LOGGING_ID]; if (id == null) break

			path.push (id)
			
		}

		return path.reverse ()

	}

	listen () {

		const {emitter, events} = this

		for (const event in events)
			
			emitter.on (

				event,
				
				events [event].handler =

					payload => this.log (event, payload)

			)

	}

	log (event, payload) {

		this.logger.log (this.getInfo (event, payload))

	}

	unlisten () {

		const {emitter, events} = this

		for (const event in events)

			emitter.off (event, events [event].handler)

	}

	getDefaultEvents () {

		return {
			error: {
				level: 'error', 
				message: error => error.stack, 
				details: error => error
			},
		}

	}

	getInfo (event, payload) {

		const {emitter, id, events} = this; if (!(event in events)) return null

		const conf = events [event], info = {event}

		for (const k of ['level', 'message', 'details']) {

			const v = conf [k]; if (!v) continue

			info [k] = typeof v === 'function' ? v.call (emitter, payload) : v

		}

		if (id != null) info.id = id

		if (conf.elapsed) info.elapsed = Date.now () - this.start

		return info

	}

}

module.exports = Tracker
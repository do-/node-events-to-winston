const {EventEmitter} = require ('node:events')
const {configure} = require ('safe-stable-stringify')

const DONE = Symbol ('details formatted')

const CH_P_UC = 'P'.charCodeAt (0)
const CH_P_LC = 'p'.charCodeAt (0)

const CL_POJO = {}.constructor
const CL_BUFFER_JSON = Buffer.from ([]).toJSON ().constructor

const isPassword = k => {

	switch (k.charCodeAt (0)) {

		case CH_P_LC:
			return k.startsWith ('passw')

		case CH_P_UC:
			return k.startsWith ('Passw') || k.startsWith ('PASSW')

		default:
			return false

	}

}

const checkArray = a => {

	return k => {

		for (const m of a) {

			if (m === k) return true

			if (m instanceof RegExp && m.test (k)) return true

		}

		return false
		
	}

}

const getEncoder = arg => {

	switch (typeof arg) {

		case 'function': 
			return arg

		case 'string': 
			if (Buffer.isEncoding (arg)) return b => b.toString (arg)

		default: 
			throw Error ('Invalid Buffer encoding: ' + arg)

	}
	
}

const restrictReplacer = (f, maxLength, ellipsis, enc, hideClasses) => {

	if (maxLength === Infinity) return f

	if (!Number.isSafeInteger (maxLength) || maxLength <= 0) throw Error ('Invalid maxLength: ' + maxLength)

	const encode = getEncoder (enc), cut = v => {

		if (typeof v === 'object' && v !== null) {

			switch (v.constructor) {

				case CL_POJO:
					break

				case CL_BUFFER_JSON:
					try {
						v = encode (Buffer.from (v))
					}
					catch (err) {
						// do nothing, leave it as is
					}

				default:
					for (const c of hideClasses) 
						if (v instanceof c) return undefined

			}

		}

		if (typeof v === 'string' && v.length > maxLength) v = v.substring (0, maxLength) + ellipsis

		return v

	}

	if (!f) return (k, v) => cut (v)

	return function (k, v) {return cut (f (k, v))}
	
}

module.exports = class {

	constructor (o = {}) {

		this.delimiter = o.delimiter ?? ' '

		this.stringify = configure (o.stringify ?? {})

		this.space = o.space

		this.replacer = restrictReplacer (this.getReplacer (o)
			, o.maxLength   ?? 50
			, o.ellipsis    ?? '...'
			, o.encoding    ?? 'base64'
			, o.hideClasses ?? [EventEmitter]
		)

	}

	getReplacer ({replacer, mask}) {

		if (replacer !== undefined) return replacer

		const {keys, value} = this.adjustMask (mask)

		return (k, v) => keys (k) ? value : v

	}

	adjustMask (mask) {

		if (mask === undefined) {

			mask = isPassword

		}
		else {

			if (typeof mask === 'string' || mask instanceof RegExp) mask = [mask]

		}

		if (Array.isArray (mask)) mask = checkArray (mask)

		if (typeof mask === 'function') mask = {keys: mask}

		if (!mask.keys) mask.keys = isPassword

		return mask

	}

	transform (info) {

		if (DONE in info) return info

		const {details} = info; if (details != null) {

			info.message += this.delimiter + this.stringify (details, this.replacer, this.space)

			info [DONE] = true

		}

		return info

	}

}
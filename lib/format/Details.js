const {configure} = require ('safe-stable-stringify')

const CH_P_UC = 'P'.charCodeAt (0)
const CH_P_LC = 'p'.charCodeAt (0)

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

const restrictReplacer = (f, maxLength, ellipsis) => {

	if (maxLength == null) return f

	if (!Number.isSafeInteger (maxLength) || maxLength <= 0) throw Error ('Invalid maxLength: ' + maxLength)

	const cut = v =>
		typeof v !== 'string' ? v : 
		v.length <= maxLength ? v : 
		v.substring (0, maxLength) + ellipsis

	if (!f) return (k, v) => cut (v)

	return function (k, v) {return cut (f (k, v))}
	
}

module.exports = class {

	constructor (o = {}) {

		this.delimiter = o.delimiter ?? ' '

		this.stringify = configure (o.stringify ?? {})

		this.space = o.space

		this.replacer = restrictReplacer (this.getReplacer (o), o.maxLength, o.ellipsis ?? '...')

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

		const {details} = info; if (details != null) {

			info.message += this.delimiter + this.stringify (details, this.replacer, this.space)

		}

		return info

	}

}
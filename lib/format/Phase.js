const {ObjectMerger} = require ('subclassable-object-merger')

const DEFAULT_DELIMITER = ' '

const PH_ERROR  = 'error'
const PH_SINGLE = 'single'
const PH_FIRST  = 'first'
const PH_LAST   = 'last'
const PH_OTHER  = 'other'

const DEFAULT_SIGILS = Object.fromEntries ([
	[PH_ERROR,  '!'],
	[PH_SINGLE, '*'],
	[PH_FIRST,  '>'],
	[PH_LAST,   '<'],
	[PH_OTHER,  '-'],
])

const DEFAULT_ERROR_LEVELS = [
	'error',
	'warn',
  	'emerg',
	'alert',
	'crit',
]

const OM = new ObjectMerger ({override: ['scalar']})

module.exports = class {

	constructor (options = {}) {

		OM.merge (options, this.getDefaultOptions ())

		for (const k in options) this [k] = options [k]

	}

	isError ({level, event, details}) {

		if (details instanceof Error || event === 'error') return true

		if (level === 'info') return false

		return this.errorLevels.includes (level)
		
	}

	getPhase (info) {

		if (this.isError (info)) return PH_ERROR

		const {isFirst, isLast} = info; return (
			isFirst ?
				(isLast ? PH_SINGLE : PH_FIRST) :
				(isLast ? PH_LAST   : PH_OTHER)
		)

	}

	getDefaultOptions () {

		return {
			message:     true,
			delimiter:   DEFAULT_DELIMITER,
			sigils:      DEFAULT_SIGILS,
			errorLevels: DEFAULT_ERROR_LEVELS,
		}

	}

	transform (info) {

		if ('phase' in info) return info

		info.phase = this.getPhase (info)

		info.sigil = this.sigils [info.phase]

		if (this.message) info.message = (info.sigil + this.delimiter + (info.message ?? '')).trim ()

		return info

	}

}
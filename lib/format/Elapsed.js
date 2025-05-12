const util = require ('node:util')

const DEFAULT_TEMPLATE = '%i ms'

module.exports = class {

	constructor (o = {}) {

		this.template = o.template ?? DEFAULT_TEMPLATE

		this.check    = o.check  ?? (({elapsed, event, message}) => message === event && Number.isInteger (elapsed))

		this.format   = o.format ?? (info => util.format (this.template, info.elapsed))

	}

	transform (info) {

		if ('elapsed' in info && this.check (info)) info.message = this.format (info)

		return info

	}

}
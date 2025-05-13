const {formatPhase} = require ('..')

test ('basic', async () => {

	expect (formatPhase ().transform ({level: 'info'}).message).toBe ('-')
	expect (formatPhase ().transform ({level: 'info', message: 'A'}).message).toBe ('- A')
	expect (formatPhase ({sigils: {error: '?'}}).transform ({level: 'error', message: 'A'}).message).toBe ('? A')
	expect (formatPhase ().transform ({level: 'info', message: 'A', details: Error ('OK')}).message).toBe ('! A')
	expect (formatPhase ().transform ({level: 'info', message: 'A', event: 'error'}).message).toBe ('! A')
	expect (formatPhase ({delimiter: ''}).transform ({level: 'info', message: 'A'}).message).toBe ('-A')
	expect (formatPhase ({message: false}).transform ({level: 'info', message: 'A'}).message).toBe ('A')
	expect (formatPhase ().transform ({level: 'info', message: 'A', isFirst: true}).message).toBe ('> A')
	expect (formatPhase ().transform ({level: 'info', message: 'A', isLast: true}).message).toBe ('< A')
	expect (formatPhase ().transform ({level: 'info', message: 'A', isFirst: true, isLast: true}).message).toBe ('* A')

})

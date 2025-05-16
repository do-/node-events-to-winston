const {formatElapsed} = require ('..')

test ('basic', async () => {

	expect (formatElapsed ().transform ({elapsed: 7, event: 'finish', message: 'finish'}).message).toBe ('7 ms')
	expect (formatElapsed ({}).transform ({elapsed: 7, event: 'finish', message: 'finish'}).message).toBe ('7 ms')
	expect (formatElapsed ({template: '%i milliseconds elapsed'}).transform ({elapsed: 7, event: 'finish', message: 'finish'}).message).toBe ('7 milliseconds elapsed')
	expect (formatElapsed ({}).transform ({elapsed: '7', event: 'finish', message: 'finish'}).message).toBe ('finish')
	expect (formatElapsed ({check: _ => true}).transform ({elapsed: 7, event: 'finish', message: 'finish'}).message).toBe ('7 ms')

	{
		const f = formatElapsed (), info = {elapsed: 7, event: 'finish', message: 'finish'}
		expect (f.transform (info).message).toBe ('7 ms')
		expect (f.transform (info).message).toBe ('7 ms')
	}

})

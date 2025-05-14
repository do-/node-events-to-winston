const {formatDetails} = require ('..')

test ('basic', async () => {

	expect (formatDetails ().transform ({message: '<'}).message).toBe ('<')
	expect (formatDetails ().transform ({message: '<', details: 42}).message).toBe ('< 42')
	expect (formatDetails ({stringify:{deterministic: false}}).transform ({message: '<', details: {id: 1, code: 'RED'}}).message).toBe ('< {"id":1,"code":"RED"}')
	expect (formatDetails ().transform ({message: '<', details: {id: 1, login: 'a', password: '1', PASSWD: '1'}}).message).toBe ('< {"id":1,"login":"a"}')
	expect (formatDetails ({mask: /^passw/}).transform ({message: '<', details: {id: 1, auth:{login: 'a', password: '1'}}}).message).toBe ('< {"auth":{"login":"a"},"id":1}')
	expect (formatDetails ({mask: ['login', /^passw/]}).transform ({message: '<', details: {id: 1, auth:{login: 'a', password: '1'}}}).message).toBe ('< {"auth":{},"id":1}')
	expect (formatDetails ({mask: {value: 'XXX'}}).transform ({message: '<', details: {id: 1, Login: 'a', Password: '1'}}).message).toBe ('< {"Login":"a","Password":"XXX","id":1}')
	expect (formatDetails ({replacer: null}).transform ({message: '<', details: {id: 1, login: 'a', password: '1'}}).message).toBe ('< {"id":1,"login":"a","password":"1"}')
	expect (formatDetails ({maxLength: 3, replacer: null}).transform ({message: '<', details: {id: 1, code: 'RED', label: 'Loooong'}}).message).toBe ('< {"code":"RED","id":1,"label":"Loo..."}')
	expect (formatDetails ({maxLength: 3, ellipsis: '…', replacer: (_, v) => typeof v === 'number' ? String (v) : v}).transform ({message: '<', details: {id: 1, code: 'RED', label: 'Loooong'}}).message).toBe ('< {"code":"RED","id":"1","label":"Loo…"}')
	expect (formatDetails ({maxLength: Infinity}).transform ({message: '<', details: {label: 'Looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong'}}).message).toBe ('< {"label":"Looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong"}')
	expect (formatDetails ().transform ({message: '<', details: {buf: Buffer.from ([33, 33, 33, 33, 33, 33])}}).message).toBe ('< {\"buf\":\"ISEhISEh\"}')
	expect (formatDetails ({encoding: 'hex'}).transform ({message: '<', details: {buf: Buffer.from ([33, 33, 33, 33, 33, 33])}}).message).toBe ('< {\"buf\":\"212121212121\"}')
	expect (formatDetails ({encoding: _ => undefined}).transform ({message: '<', details: {buf: Buffer.from ([33, 33, 33, 33, 33, 33])}}).message).toBe ('< {}')

	expect (() => formatDetails ({maxLength: -1})).toThrow ('maxLength')
	expect (() => formatDetails ({maxLength: 0})).toThrow ('maxLength')
	expect (() => formatDetails ({maxLength: 3.14})).toThrow ('maxLength')
	expect (() => formatDetails ({maxLength: '20'})).toThrow ('maxLength')
	expect (() => formatDetails ({encoding: 'hexen'})).toThrow ('encoding')

})

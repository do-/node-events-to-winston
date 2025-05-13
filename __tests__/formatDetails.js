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

})

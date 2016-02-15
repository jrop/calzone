'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.should()

const builder = require('../index')
const co = require('co')
const path = require('path')

require('./dsl')
require('./opt')
require('./util')

describe('Builder', () => {
	it('should build the sample project', co.wrap(function * () {
		const build = builder({
			silent: true,
			cwd: path.join(__dirname, 'sample-project')
		})

		yield build.run()
		require('./sample-project/build/my-file').should.eql('Hello Calzone!')
		
		chai.expect(function() {
			require('./sample-project/build/another-file')
		}).to.throw(/Cannot find module/)

		yield build.clean()
	}))
})

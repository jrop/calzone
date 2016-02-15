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
		require('./sample-project/build/file1').should.eql('Hello Calzone!')
		require('./sample-project/build/file2').should.eql('Hello Mocha!')
		
		chai.expect(function() {
			require('./sample-project/build/file3')
		}).to.throw(/Cannot find module/)

		yield build.clean()
	}))
})

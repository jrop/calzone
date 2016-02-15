'use strict'

const builder = require('../lib/builder')
const opt = require('../lib/opt')
const path = require('path')

describe('Options', () => {
	it('should parse command line options', () => {
		const argv = opt.getOptions([ '-i', 'some_src', '-d', 'some_dst', '-x', 'some_exclude' ]).argv
		argv.src.should.eql('some_src')
		argv.out.should.eql('some_dst')
		argv.exclude.should.eql([ 'some_exclude' ])
	})

	it('should honor the options in the .json file', () => {
		const cwd = path.resolve(__dirname, 'sample-project')
		const options = opt.getOptions([ '--cwd', cwd ]).options

		options.cwd.should.contain('sample-project')
		options.src.should.contain('sample-project/the_src')
		options.out.should.contain('sample-project/build')
		options.includeAll.should.eql(false)
		options.files.should.have.keys(path.resolve(cwd, 'the_src/my-file.js'))
	})
})

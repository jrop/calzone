#!/usr/bin/env node
'use strict'

const builder = require('./builder')
const path = require('path')
const yargs = require('yargs')
const _ = require('lodash')

function loadLocalFile(f) {
	try {
		return require(path.join(process.cwd(), f))
	} catch (e) {
		return { }
	}
}

const argv = yargs.help('help').alias('help', 'h')

	.version(require('./package.json').version).alias('version', 'v')

	.option('config-file', {
		description: 'The config file to read from',
		type: 'string',
		default: '.jsbuild.json'
	}).alias('config-file', 'config').alias('config', 'c')

	.option('src-dir', {
		description: 'The output directory to put all of the built files in',
		type: 'string',
	}).alias('src-dir', 'src').alias('src', 'i')
	
	.option('out-dir', {
		description: 'The output directory to put all of the built files in',
		type: 'string',
	}).alias('out-dir', 'out').alias('out', 'd')
	
	.option('include-all', {
		description: 'Whether to copy files without the @build annotation to the output directory',
		type: 'boolean',
		default: true, // since this option is a flag, we need to explicitly default it to true *here*
	}).alias('include-all', 'a')

	.option('exclude', {
		description: 'Files to exclude when reading from the source directory',
		type: 'array'
	}).alias('exclude', 'x')

	.option('watch', {
		description: 'Watch the source directory for changes',
		type: 'boolean',
		default: false,
	}).alias('watch', 'w')

	.argv

const options = _.merge({
	src: 'src',
	out: 'build',
	includeAll: true,
	exclude: [ 'node_modules' ]
}, loadLocalFile(argv.config), _.pick(argv, 'src', 'out', 'includeAll', 'exclude'))

// load builders:
options.builders = _.merge(require('./default-builders'), loadLocalFile('.builders.js'))
options.builders.__json__ = _.mapKeys(loadLocalFile('.builders.json'), (value, file) => {
	return path.resolve(process.cwd(), file)
})

// normalize paths:
options.src = path.resolve(process.cwd(), options.src)
options.out = path.resolve(process.cwd(), options.out)
options.exclude = options.exclude.map(e => path.resolve(process.cwd(), e))

const b = builder(options)
if (argv.watch)
	b.watch()
else
	b.run().catch(e => console.error(e.stack))

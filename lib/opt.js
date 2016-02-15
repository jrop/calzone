#!/usr/bin/env node
'use strict'

require('colors')
const fs = require('fs')
const path = require('path')
const yargs = require('yargs')
const _ = require('lodash')

function loadLocalFile(f, cwd, print) {
	try {
		return require(path.join(cwd, f))
	} catch (e) {
		let exists = false
		try { fs.accessSync(f, fs.F_OK); exists = true } catch (e2) { }

		if (print && exists) {
			console.log('Error loading'.red, f.yellow)
			console.log(e.stack.red)
		}

		return { }
	}
}

function getArgvInfo(argumentVector) {
	if (!argumentVector)
		argumentVector = process.argv

	const argv = yargs.help('help').alias('help', 'h')

		.version(require('../package.json').version).alias('version', 'v')

		.option('config-file', {
			description: 'The config file to read from',
			type: 'string',
			default: '.builders.json'
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

		.option('cwd', {
			description: 'The current working directory to run under',
			default: '.',
			type: 'string'
		})

		.option('watch', {
			description: 'Watch the source directory for changes',
			type: 'boolean',
			default: false,
		}).alias('watch', 'w').parse(argumentVector)

	argv.cwd = path.resolve(process.cwd(), argv.cwd)
	return { argv, raw: yargs.reset().argv }
}

module.exports.normalizeOptions = function(options, argv) {
	const argInfo = getArgvInfo(argv)
	const cwd = options.cwd || argInfo.argv.cwd

	options = _.merge({
		cwd,
		src: 'src',
		out: 'build',
		includeAll: true,
		exclude: [ 'node_modules' ],
		builders: require('../lib/default-builders'),
	},
		loadLocalFile('.builders.json', cwd),
		loadLocalFile('.builders.js', cwd, true),
		_.pick(argInfo.argv, 'src', 'out', 'exclude'),
		options || { })

	// if the argument --include-all is preset, use it instead of the default
	options.includeAll = typeof argInfo.raw.includeAll != 'undefined' ? argInfo.raw.includeAll : options.includeAll

	// normalize paths:
	options.src = path.resolve(cwd, options.src)
	options.out = path.resolve(cwd, options.out)
	options.exclude = options.exclude.map(e => path.resolve(cwd, e))
	options.files = _.mapKeys(options.files, (val, key) => path.resolve(cwd, key))

	return { options, argv: argInfo.argv }
}

module.exports.getOptions = function(argv) {
	return module.exports.normalizeOptions({ }, argv)
}

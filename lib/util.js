'use strict'

require('colors')
const annotation = require('./annotation-parser')
const co = require('co')
const events = require('events')
const joi = require('joi')
const path = require('path')
const through2 = require('through2')
const _ = require('lodash')

//
// Utility to return various paths of interest for a given file
//
function getPathInfo(options, file, cwd) {
	if (!cwd)
		cwd = process.cwd()

	const fileUnderSrc = path.relative(options.src, file)
	return {
		file: path.relative(cwd, file), // src/index.js
		name: fileUnderSrc,                       // index.js
		src: file,                                // /full/path/to/index.js
		dst: path.dirname(path.join(options.out, fileUnderSrc)), // /full/path/to/build/ [without index.js]
		dstFile: path.join(options.out, fileUnderSrc), // /fule/path/to/build/index.js
	}
}

//
// Returns globs from the passed options
//
function getGlobsFromOptions(options) {
	return [ '**/*.*', '**/.*' ]
		.map(g => path.join(options.src, g))
		.concat(options.exclude.map(e => '!' + e))
}

//
// Stream version of noop
//
function identityStream() {
	return through2.obj((chunk, enc, callback) => callback(null, chunk))
}

//
// Gets and parses the @build annotation from a files contents
//
function getAnnotationInfoFromContents(contents) {
	const comments = contents.match(/\/\*([\s\S]*?)\*\//g)
	if (!comments)
		return null

	for (let comment of comments) {
		if (comment.indexOf('@build') != -1) {
			comment = _.trimEnd(_.trimStart(comment, '/*'), '*/')
			return annotation.parse(comment)
		}
	}
	return null
}

//
// Gets the build configuration from either the .builders.json or the file annotation
//
function getBuildConfig(options, file, contents) {
	let buildConfig = options.builders.__json__[file] || getAnnotationInfoFromContents(contents)
	if (!buildConfig)
		return Promise.resolve(null)

	// validate the config:
	const schema = joi.array().items(
		joi.object().keys({
			type: joi.string(),
			config: joi.any()
		}))

	return new Promise((yes, no) => {
		joi.validate(buildConfig, schema, (err, value) => {
			return err ? no(err) : yes(value)
		})
	})
}

//
// Creates the 'after source' pipe given the input configuration
//
const getTransformationInfo = co.wrap(function * (options, file, contents) {
	const buildConfig = yield getBuildConfig(options, file, contents)
	const errorEmmitter = new events.EventEmitter()

	const head = identityStream()
	let tail = head
	if (buildConfig) {
		for (const buildStep of buildConfig) {
			const fn = options.builders[buildStep.type]
			if (typeof fn != 'function')
				throw new Error('The builder "' + buildStep.type + '" is not defined')

			const nextPipe = fn.call(tail, buildStep.config)
			if (!nextPipe || !nextPipe.pipe)
				throw new Error('The builder ' + buildStep.type + 'did not return a valid stream (occured while building ' + getPathInfo(options, file).name + ')')

			tail = tail.pipe(nextPipe)
			tail.on('error', e => errorEmmitter.emit('error', e))
		}

		return { errors: errorEmmitter, head, tail, status: 'built' }
	} else if (options.includeAll) {
		return { errors: errorEmmitter, head, tail: head, status: 'copied' }
	} else {
		// skip file
		return { errors: errorEmitter, head: null, tail: null, status: 'skipped' }
	}
})

module.exports = {
	getPathInfo, getGlobsFromOptions, identityStream,
	getAnnotationInfoFromContents, getBuildConfig, getTransformationInfo
}

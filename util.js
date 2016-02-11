'use strict'

const annotation = require('./annotation-parser')
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
// Allows for awaiting a stream to end
//
function streamToPromise(stream) {
	return new Promise((yes, no) => {
		stream.on('error', no).on('end', yes)
	})
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
	let buildConfig = options.builders.json[file] || getAnnotationInfoFromContents(contents)
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

module.exports = {
	getPathInfo, getGlobsFromOptions, identityStream,
	streamToPromise, getAnnotationInfoFromContents, getBuildConfig,
}

'use strict'

require('colors')

const annotation = require('./annotation-parser')
const co = require('co')
const globby = require('globby')
const gulp = require('gulp')
const joi = require('joi')
const fs = require('mz/fs')
const path = require('path')
const through2 = require('through2')
const stream = require('stream')
const _ = require('lodash')

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

//
// Creates the build pipe for the file and awaits it
//
const waitForBuildPipe = co.wrap(function * (options, file, contents, src, dst, niceName) {
	let buildConfig = null
	try {
		buildConfig = yield getBuildConfig(options, file, contents)
	} catch (e) {
		throw new Error('Could not read build config for file "' + file + '": ' + e.message)
	}

	try {
		if (buildConfig) {
			let pipe = gulp.src(src)
			for (const buildStep of buildConfig) {
				const fn = options.builders[buildStep.type]
				if (typeof fn != 'function')
					throw new Error('The builder "' + buildStep.type + '" is not defined')

				let nextPipe = fn.call(pipe, buildStep.config)
				if (!nextPipe || !nextPipe.pipe) {
					console.log('Warning: the builder'.yellow, buildStep.type, 'did not return a valid stream'.yellow, '(occured while building ' + niceName.cyan + ')')
					nextPipe = pipe.pipe(identityStream())
				}

				pipe = nextPipe //pipe.pipe(nextPipe)
			}
			pipe = pipe.pipe(gulp.dest(dst))
			return streamToPromise(pipe)
				.then(() => console.log(niceName.cyan, 'built'.green))
		} else if (options.includeAll) {
			console.log(niceName.cyan, 'copied'.blue)
			return streamToPromise(gulp.src(src).pipe(gulp.dest(dst)))
		} else {
			// skip file
			console.log(niceName.cyan, 'skipped'.yellow)
		}
	} catch (e) {
		throw new Error('Error building file: "' + niceName + '": InnerException: ' + e.stack)
	}
})

//
// Kicks off building a file
//
const buildFile = co.wrap(function * (options, file) {
	const fileNice = path.relative(process.cwd(), file)
	const fileRelativeToSrc = path.relative(options.src, file)
	const src = file
	const dst = path.dirname(path.join(options.out, fileRelativeToSrc))

	const contents = (yield fs.readFile(file)).toString()
	yield waitForBuildPipe(options, file, contents, src, dst, fileNice)
})

module.exports = function builder(options) {
	const lib = {
		watch() {
			throw new Error('watch is not yet implemented')
		},

		run: co.wrap(function * () {
			const globs = [ '**/*.*', '**/.*' ]
				.map(g => path.join(options.src, g))
				.concat(options.exclude.map(e => '!' + e))

			const files = yield globby(globs)
			yield Promise.all(files.map(f => buildFile(options, f)))
		})
	}
	return lib
}

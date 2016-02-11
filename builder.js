'use strict'

require('colors')

const annotation = require('./annotation-parser')
const chokidar = require('chokidar')
const co = require('co')
const events = require('events')
const globby = require('globby')
const gulp = require('gulp')
const joi = require('joi')
const fs = require('mz/fs')
const path = require('path')
const through2 = require('through2')
const stream = require('stream')
const _ = require('lodash')

//
// Utility to return various paths of interest for a given file
//
function getPathInfo(options, file) {
	const fileUnderSrc = path.relative(options.src, file)
	return {
		file: path.relative(process.cwd(), file), // src/index.js
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

//
// Creates the build pipe for the file and awaits it
//
const waitForBuildPipe = co.wrap(function * (options, contents, src, dst, niceName) {
	let buildConfig = null
	try {
		buildConfig = yield getBuildConfig(options, src, contents)
	} catch (e) {
		throw new Error('Could not read build config for file "' + src + '": ' + e.message)
	}

	const emitter = new events.EventEmitter()

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
				pipe.on('error', e => emitter.emit('error', e))
			}
			pipe = pipe.pipe(gulp.dest(dst))
			pipe.on('end', () => {
				console.log(niceName.cyan, 'built'.green)
				emitter.emit('end')
			})
		} else if (options.includeAll) {
			gulp.src(src).pipe(gulp.dest(dst)).on('end', () => {
				console.log(niceName.cyan, 'copied'.blue)
				emitter.emit('end')
			})
		} else {
			// skip file
			console.log(niceName.cyan, 'skipped'.yellow)
			emitter.emit('end')
		}
	} catch (e) {
		throw new Error('Error building file: "' + niceName + '": InnerException: ' + e.stack)
	}

	return streamToPromise(emitter)
})

//
// Kicks off building a file
//
const buildFile = co.wrap(function * (options, file) {
	const pathInfo = getPathInfo(options, file)
	const contents = (yield fs.readFile(file)).toString()
	yield waitForBuildPipe(options, contents, file, pathInfo.dst, pathInfo.file)
})

//
// Removes a file from the build directory
//
const unbuildFile = co.wrap(function * (options, file) {
	const pathInfo = getPathInfo(options, file)
	console.log(pathInfo.file.cyan, 'deleted'.red)
	yield fs.unlink(pathInfo.dstFile)
})

// console.log(_.functionsIn(fs))

module.exports = function builder(options) {
	const lib = {
		watch() {
			function make(f) {
				buildFile(options, f)
					// .then(() => console.log('done'.green, 'with', f))
					.catch(e => {
						if (e.codeFrame)
							console.error(e.message + '\n' + e.codeFrame)
						else if (e.stack)
							console.error(e.stack.red)
						else
							console.error(e)
					})
			}

			const watcher = chokidar.watch(getGlobsFromOptions(options))
				// .on('all', (e, f) => console.log(e, f))
				.on('add', make)
				.on('change', make)
				.on('unlink', f => unbuildFile(options, f))
		},

		run: co.wrap(function * () {
			const files = yield globby(getGlobsFromOptions(options))
			yield Promise.all(files.map(f => buildFile(options, f)))
		})
	}
	return lib
}

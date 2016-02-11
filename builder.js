'use strict'

require('colors')

const chokidar = require('chokidar')
const co = require('co')
const events = require('events')
const globby = require('globby')
const gulp = require('gulp')
const fs = require('mz/fs')
const util = require('./util')

//
// Creates the build pipe for the file and awaits it
//
const waitForBuildPipe = co.wrap(function * (options, contents, src, dst, niceName) {
	let buildConfig = null
	try {
		buildConfig = yield util.getBuildConfig(options, src, contents)
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

	return util.streamToPromise(emitter)
})

//
// Kicks off building a file
//
const buildFile = co.wrap(function * (options, file) {
	const pathInfo = util.getPathInfo(options, file)
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

			const watcher = chokidar.watch(util.getGlobsFromOptions(options))
				// .on('all', (e, f) => console.log(e, f))
				.on('add', make)
				.on('change', make)
				.on('unlink', f => unbuildFile(options, f))
		},

		run: co.wrap(function * () {
			const files = yield globby(util.getGlobsFromOptions(options))
			yield Promise.all(files.map(f => buildFile(options, f)))
		})
	}
	return lib
}

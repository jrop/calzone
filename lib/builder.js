'use strict'

require('colors')

const chokidar = require('chokidar')
const co = require('co')
const globby = require('globby')
const gulp = require('gulp')
const fs = require('mz/fs')
const opt = require('./opt')
const util = require('./util')
const rimraf = require('rimraf')

//
// Creates the build pipe for the file and awaits it
//
const waitForBuildPipe = co.wrap(function * (options, file, contents) {
	const pathInfo = util.getPathInfo(options, file)
	const transformerInfo = yield util.getTransformationInfo(options, file, contents)

	if (transformerInfo.head == null && transformerInfo.tail == null) {
		!options.silent && console.log(pathInfo.name.cyan, transformerInfo.status.yellow)
		return
	}

	// set pipe sink:
	transformerInfo.tail = transformerInfo.tail.pipe(gulp.dest(pathInfo.dst))

	// now send the file through the pipe!
	transformerInfo.head = gulp.src(file).pipe(transformerInfo.head)

	try {
		yield new Promise((yes, no) => {
			transformerInfo.errors.on('error', no)
			transformerInfo.tail.on('error', no)
			transformerInfo.tail.on('end', yes)
		})

		switch (transformerInfo.status) {
		case 'built':
			!options.silent && console.log(pathInfo.name.cyan, transformerInfo.status.green)
			break
		case 'copied':
			!options.silent && console.log(pathInfo.name.cyan, transformerInfo.status.blue)
			break
		case 'skipped':
			!options.silent && console.log(pathInfo.name.cyan, transformerInfo.status.yellow)
			break
		}
	} catch (e) {
		console.log(pathInfo.name.cyan, 'error'.red)
		throw e
	}
})

//
// Kicks off building a file
//
const buildFile = co.wrap(function * (options, file) {
	const pathInfo = util.getPathInfo(options, file)
	const contents = (yield fs.readFile(file)).toString()
	yield waitForBuildPipe(options, file, contents)
})

//
// Removes a file from the build directory
//
const unbuildFile = co.wrap(function * (options, file) {
	const pathInfo = util.getPathInfo(options, file)
	console.log(pathInfo.file.cyan, 'deleted'.red)
	yield fs.unlink(pathInfo.dstFile)
})

function handleError(e) {
	process.exitCode = 1
	if (e.codeFrame)
		console.error(e.message + '\n' + e.codeFrame)
	else if (e.stack)
		console.error(e.stack.red)
	else
		console.error(e)
}

module.exports = function builder(options) {
	options = opt.normalizeOptions(options).options

	const lib = {
		watch() {
			function make(f) {
				buildFile(options, f).catch(handleError)
			}

			const watcher = chokidar.watch(util.getGlobsFromOptions(options))
				// .on('all', (e, f) => console.log(e, f))
				.on('add', make)
				.on('change', make)
				.on('unlink', f => unbuildFile(options, f))
		},

		run: co.wrap(function * () {
			const files = yield globby(util.getGlobsFromOptions(options), { cwd: options.cwd })
			try {
				yield Promise.all(files.map(f => buildFile(options, f)))
			} catch (e) {
				!options.silent && handleError(e)
				throw e
			}
		}),

		clean: co.wrap(function * () {
			yield new Promise((yes, no) => rimraf(options.out, err => err ? no(err) : yes()))
		})
	}
	return lib
}

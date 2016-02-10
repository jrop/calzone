'use strict'

require('colors')

const annotation = require('./annotation-parser')
const co = require('co')
const globby = require('globby')
const gulp = require('gulp')
const fs = require('mz/fs')
const path = require('path')
const stream = require('stream')
const _ = require('lodash')

const getAnnotationInfo = function (contents) {
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

const buildFile = co.wrap(function * (options, file) {
	const contents = (yield fs.readFile(file)).toString()
	const annotation = getAnnotationInfo(contents)
	const rel = path.relative(path.join(process.cwd(), options.src), file)

	// first check to see if this file has the annotation:
	if (annotation) {
		//
		// Now we can build the gulp pipe based on the @build annotation
		//
		let pipe = gulp.src(file)
		for (const buildSpec of annotation) {
			// buildSpec.{ type, config }

			// try to find the corresponding builder in the builders.js file:
			let fn = options.builders[buildSpec.type]
			if (typeof fn != 'function') {
				console.log('Could not find builder'.yellow, buildSpec.type.red, 'in local builders.js file'.yellow)
			} else {
				// setup pipe
				const nextPipe = fn(buildSpec.config)
				if (!nextPipe || typeof nextPipe.on != 'function')
					console.log('Builder'.red, buildSpec.type.yellow, 'did not return a writable stream'.red)
				else
					pipe = pipe.pipe(nextPipe)
			}
		}

		// now pipe to the output directory:
		pipe = pipe.pipe(gulp.dest(path.join(process.cwd(), options.out)))

		console.log(rel, 'transformed'.green, 'via', annotation.map(a => a.type.cyan).join(' |> '.yellow))
		
		// TODO wait for stream
	} else if (options.includeAll) {
		// just pipe it to the output directory:
		const pipe = gulp.src(file)
			.pipe(gulp.dest(path.join(process.cwd(), options.out)))

		// TODO wait for stream
		console.log(rel, 'copied'.blue, 'to output directory')
	} else {
		console.log(rel, 'skipped'.yellow)
	}
})

module.exports = function builder(options) {
	const lib = {
		watch() {
			throw new Error('watch is not yet implemented')
		},

		run: co.wrap(function * () {
			const globs = [ '**/*.*', '**/.*' ]
				.map(g => path.join(process.cwd(), options.src, g))
				.concat(options.exclude.map(e => '!' + path.join(process.cwd(), e)))

			const files = yield globby(globs)
			yield Promise.all(files.map(f => buildFile(options, f)))
			console.log('done'.green)
		})
	}
	return lib
}

'use strict'

const colors = require('colors')
const path = require('path')
const _ = require('lodash')

function rqr(name) {
	return require(path.join(process.cwd(), 'node_modules', name))
}

function pipeFactory(name) {
	return function(config) {
		const pipeCreator = rqr(name)
		return this.pipe(pipeCreator(config))
	}
}

function webpack(config) {
	try { config = _.merge(config, require(path.join(process.cwd(), 'webpack.config.js'))) }
	catch (e) { console.log('Counldn\'t load local webpack.config.js'.yellow) }

	const named = rqr('vinyl-named')
	const webpack = rqr('gulp-webpack')
	return this.pipe(named())
		.pipe(webpack(_.merge({ quiet: true }, config)))
}

module.exports = {
	autoprefixer: pipeFactory('autoprefixer'),
	babel: pipeFactory('gulp-babel'),
	coffee: pipeFactory('gulp-coffee'),
	less: pipeFactory('gulp-less'),
	react: pipeFactory('gulp-react'),
	uglify: pipeFactory('gulp-uglify'),
	webpack,
}

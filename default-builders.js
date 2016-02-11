'use strict'

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
	try {
		const dirConf = require(path.join(process.cwd(), 'webpack.config.js'))
		config = _.merge(config, dirConf)
	} catch (e) {
		console.log('Counldn\'t load local webpack.config.js')
	}

	let named = null
	try { named = rqr('vinyl-named') } catch (e) { }

	const webpack = rqr('gulp-webpack')
	if (named)
		return this.pipe(named())
			.pipe(webpack(config))
	else
		return this.pipe(webpack(config))
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

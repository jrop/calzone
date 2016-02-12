'use strict'

const hb = require('gulp-hb')
const rename = require('gulp-rename')

module.exports = {
	hb() {
		return this
			.pipe(hb({ data: 'data/**/*.json' }))
			.pipe(rename({ extname: '.html' }))
	}
}
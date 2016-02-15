'use strict'

const through2 = require('through2')

module.exports.builders = {
	my_builder() {
		return this.pipe(through2.obj(function(file, enc, callback) {
			file.contents = new Buffer(file.contents.toString().replace('World', 'Calzone'))
			callback(null, file)
		}))
	}
}

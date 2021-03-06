'use strict'

require('chai').should()
const anno = require('../lib/annotation-parser')

describe('Annotation parser', () => {
	it('should parse an empty annotation', () => {
		anno.parse('@build').should.eql([ ])
	})

	it('should parse a basic annotation', () => {
		anno.parse('@build babel').should.deep.eql([ { type: 'babel' } ])
	})

	it('should parse an annotation with complex params', () => {
		anno.parse('@build babel(true, { presets: [ "es2015" ], plugins: [ [ "transform-async-to-module-method", { module: "co", method: \'wrap\' } ] ] })')
			.should.deep.eql([ {
				type: 'babel',
				params: [ true, {
					presets: [ 'es2015' ],
					plugins: [
						[ 'transform-async-to-module-method', {
							module: 'co',
							method: 'wrap'
						} ]
					]
				} ]
			} ])
	})

	it('should parse pipe notation', () => {
		anno.parse('@build babel |> uglify')
			.should.deep.eql([ {
				type: 'babel'
			}, {
				type: 'uglify'
			} ])
	})
})

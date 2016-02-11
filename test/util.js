'use strict'

const should = require('chai').should()
const util = require('../util')

describe('Utilities', () => {
	it('getPathInfo should return correct data', () => {
		util.getPathInfo({
				src: '/root/src',
				out: '/root/build'
			}, '/root/src/subdir/file.js', '/')
			.should.deep.eql({
				file: 'root/src/subdir/file.js',
				name: 'subdir/file.js',
				src: '/root/src/subdir/file.js',
				dst: '/root/build/subdir',
				dstFile: '/root/build/subdir/file.js',
			})
	})

	it('getGlobsFromOptions should return correct data', () => {
		util.getGlobsFromOptions({
			src: '/root/src',
			exclude: [ '/root/src/exclude' ]
		}).should.deep.eql([
			'/root/src/**/*.*',
			'/root/src/**/.*',
			'!/root/src/exclude'
		])
	})

	it('getAnnotationInfoFromContents should extract annotations', () => {
		util.getAnnotationInfoFromContents('hey /* @build babel */ hey /* @build thisIsIgnored */')
			.should.deep.eql([ {
				type: 'babel'
			} ])

		should.equal(util.getAnnotationInfoFromContents(''), null)
	})
})
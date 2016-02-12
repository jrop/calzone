'use strict'

const co = require('co')
const should = require('chai').should()
const through2 = require('through2')
const util = require('../util')

const testStream = through2.obj((file, enc, cb) => {
	cb(null, 'transformed')
})

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
		should.equal(util.getAnnotationInfoFromContents('/**/'), null)
	})

	it('getBuildConfig should return correct data', co.wrap(function * () {
		let config = yield util.getBuildConfig({
			builders: {
				__json__: {
					'src/myfile.js': [ { type: 'proj', config: { } } ]
				}
			}
		}, 'src/myfile.js', '@build shouldBeIgnored')
		config.should.deep.eql([ { type: 'proj', config: { } } ])

		config = yield util.getBuildConfig({ builders: { __json__: { } } }, 'src/myfile.js', '/* @build file */')
		config.should.deep.eql([ { type: 'file' } ])

		config = yield util.getBuildConfig({ builders: { __json__: { } } }, 'src/myfile.js', '')
		should.equal(config, null)
	}))

	describe('getTransformationInfo', () => {
		it('should setup the pipe correctly', co.wrap(function * () {
			const contents = '/* @build test */ this is my file'
			const info = yield util.getTransformationInfo({
				builders: {
					test: function() { return this.pipe(testStream) },
					__json__: { }
				}
			}, 'my-file.js', contents)

			// capture results of the pipe:
			info.head.emit('data', contents)

			let results = null
			info.tail = info.tail.pipe(through2.obj(function (file, enc, cb) {
				results = file
				this.emit('end')
			}))

			yield new Promise((yes, no) => {
				info.tail.on('error', no)
				info.tail.on('end', yes)
			})

			results.should.eql('transformed')
		}))

		it('should scream if there is no builder defined', co.wrap(function * () {
			const contents = '/* @build test */ this is my file'
			const infoPromise = util.getTransformationInfo({
				builders: {
					__json__: { }
				}
			}, 'my-file.js', contents)

			yield infoPromise.should.be.rejectedWith(/not defined/)
		}))

		it('should scream if a builder does not return a stream', co.wrap(function * () {
			const contents = '/* @build test */ this is my file'
			const infoPromise = util.getTransformationInfo({
				src: '',
				out: '',
				builders: {
					test: function() { return 'This should be an error' },
					__json__: { }
				}
			}, 'my-file.js', contents)

			yield infoPromise.should.be.rejectedWith(/valid stream/)
		}))
	})
})
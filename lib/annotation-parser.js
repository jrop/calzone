'use strict'

const antlr4 = require('antlr4')
const AnnotationLexer = require('../dsl/js/AnnotationLexer').AnnotationLexer
const AnnotationParser = require('../dsl/js/AnnotationParser').AnnotationParser
const AnnotationVisitor = require('../dsl/js/AnnotationVisitor').AnnotationVisitor
const TerminalNode = require('antlr4/tree/Tree').TerminalNode
const _ = require('lodash')

function visit(ctx, visitors) {
	const parser = ctx.parser

	function _visit(node) {
		if (!node) {
			throw new Error('Cannot visit an empty node')
		} if (node instanceof TerminalNode) {
			return node.getText()
		} else {
			const name = parser.ruleNames[node.ruleIndex]
			if (typeof visitors[name] != 'function')
				throw new Error('Visitor \'' + name + '\' is not defined in visitors')

			const thiz = node
			thiz.visit = function(n) { return _visit(n) }
			const fn = visitors[name].bind(thiz)
			return fn(node.children)//.children.map(child => _visit(child)))
		}
	}

	return _visit(ctx)
}

function getParseTree(source) {
	const tokens = new antlr4.CommonTokenStream(new AnnotationLexer(new antlr4.InputStream(source)))
	const parser = new AnnotationParser(tokens)
	parser.buildParseTrees = true
	return parser.annotation()
}

module.exports.parse = function (source) {
	const tree = getParseTree(source)
	return visit(tree, {
		annotation() {
			// @build ...
			if (this.children.length > 1)
				return this.visit(this.children[1])//.map(c => this.visit(c))
			else
				return [ ]
		},

		buildSpecs() {
			const pipes = this.children.filter(child => !(child instanceof TerminalNode))
			// console.log(this.children.map(c => c.getText()))
			return pipes.map(c => this.visit(c))
		},

		buildSpec() {
			// e.g.: 1) babel() or 2) babel({ ... })
			const obj = { type: this.children[0].getText() }
			if (this.children.length > 3)
				obj.config = this.visit(this.children[2])
			return obj
		},

		jsonLiteral() {
			return this.visit(this.children[0])
			// console.log(this.getText(), this.children)
			// return JSON.parse(this.getText())
		},

		jsonObject() {
			// trim out '{', ',', and '}' tokens
			let keyValues = this.children.filter(e => [ '{', ',', '}' ].indexOf(e.getText()) == -1)
			keyValues = keyValues.map(kv => this.visit(kv))
			return _.assign.apply(_, keyValues)
		},

		jsonArray() {
			// trim out '[', ',', and ']' tokens
			const elements = this.children.filter(e => [ '[', ',', ']'  ].indexOf(e.getText()) == -1)
			return elements.map(e => eval(this.visit(e)))
		},

		jsonKeyValue() {
			const obj = { }
			const name = this.visit(this.children[0])
			let value = eval(this.visit(this.children[2]))

			obj[_.trim(name, '"\'')] = value
			return obj
		}
	})
}

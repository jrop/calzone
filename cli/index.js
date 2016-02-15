#!/usr/bin/env node
'use strict'

const builder = require('../lib/builder')
const opt = require('../lib/opt')

const options = opt.getOptions()
const b = builder(options.options)
if (options.argv.watch)
	b.watch()
else
	b.run().catch(e => console.error(e.stack))

calzone
=================

A command-line, project-based wrapper around gulp in an attempt to make JavaScript builds more fun and less complicated.

## Installation

Install with `npm`:

```
npm install -g calzone
```

This will expose a command-line utility that can be run with:
```
$ calzone --help # for example...
```

## Overview

`calzone` takes build hints from two sources:

1. Build configuration defined explicitly in a `.builders.json` file
2. An `/* @build ... */` annotation in your source file

The program will then create gulp streams and build your files.  By default, `calzone` assumes a directory structure like the following:

```
src/
	=> all your files...
build/
	=> where calzone directs gulp.dest() to put files
```

This directory structure can be overridden by options in `.builders.json`.

## Example Usage

Say we have the following directory structure:

```
src/
	index.js
	util.js
```

and suppose our `index.js` is written in ECMAScript 7, and we need to transpile it using Babel:

```
/* @build babel |> uglify({ preserveComments: false }) */
import util from './util'

async function main() {
	await util.longRunningOperation()
	console.log('Done.')
}
main()
```

First, you'll notice that our file declaratively defines how it is intended to be built with the `@build` annotation build-hint.  In this example, we declare that our file should be piped through two **builders**: `babel` and `uglify`.  Piping is designated using the pipe-operator `|>`.  Furthermore, configuration data can be passed to each builder as is seen with passing `{ preserveComments: false}` to the `uglify` builder.

## Builders

Builders are defined in your `.builders.js` file.  For example, if you have a LESS file with a build-annotation like `/* @build less */`, you may define a builder like:

```
// .builders.js
var autoprefixer = require('gulp-autoprefixer')
var less = require('gulp-less')

module.exports = {
	less: function() {
		return this.pipe(less())
			.pipe(autoprefixer())
	}
}
```

As demonstrated, builders take the current stream via `this`, and must return the resulting stream.

## `@build` annotation

The build-annotation's pseudo-grammar can be defined by the following:

```
@build (builder |>)* builder?
builder: name params?
params: (json-object)
```

## Project settings:

You may also override many of `calzone`'s settings by creating a `.builders.json` file:

```
{
	"src": "src/directory",
	"out": "output/directory",
	"builders": {
		"src/index.js": [ { type: "babel" }, { type: "uglify", config: { preserveComments: false } } ],
		"src/public/web-app.js": [ { type: "webpack" } ]
	}
}
```

## Default Builders

`calzone` defines a few default builders for your convenience, assuming their appropriate packages are installed in your local `node_modules` directory:

* autoprefixer
* babel
* coffee
* less
* react
* uglify
* webpack

So, if you have `gulp-autoprefixer` installed in your local `node_modules` folder, you may make use of this builder (for example, via `/* @build less */`), without defining it in your `.builders.js` file.

"use strict";

var fs                      = require('fs');
var exists                  = fs.existsSync;
var read                    = fs.readFileSync;
var path                    = require('path');
var join                    = path.join;

var utils                   = require('lodash');
var webpack                 = require('webpack');
var MemoryOutputFileSystem  = require("webpack/lib/MemoryOutputFileSystem");
var MemoryInputFileSystem   = require("enhanced-resolve/lib/MemoryInputFileSystem");

module.exports = webpackify;

function webpackify(context, options) {
  if (utils.isObject(context)) {
    options = context;
  } else {
    options = options || {};
    options.context = context;
  }

  var comilerOptions = mergeOptions(
      configureDefaults(),
      configureFromPackageMetadata(options.context),
      configureFromWebpackConfig(options.context),
      options
  );

  // prevent webpack from mangling passed options by cloning it
  var compiler = webpack(utils.cloneDeep(comilerOptions));

  // setup memory filesystem in case we don't have output defined
  if (!comilerOptions.output) {
    compiler.outputFileSystem = new MemoryOutputFileSystem({});
    compiler.outputPath = '/';
  }

  var run = compiler.run.bind(compiler);
  var watch = compiler.watch.bind(compiler);

  compiler.run = function(cb) {
    run(function(err, stats) {
      cb(err, stats, memoryFileSystemFromCompiler(compiler));
    });
  };

  compiler.watch = function(delay, cb) {
    watch(function(err, stats) {
      cb(err, stats, memoryFileSystemFromCompiler(compiler));
    });
  }

  return compiler;
}

/**
 * Provide default options
 */
function configureDefaults() {
  var options = {};
  new webpack.WebpackOptionsDefaulter().process(options);
  // we remove the default output because we want to use MemoryOutputFileSystem
  // by default and do not touch the fs
  delete options.output;
  return options;
}

/**
 * Read webpack compiler options from package metadata (package.json)
 *
 * @param {String} basedir
 */
function configureFromPackageMetadata(basedir) {
  var filename = join(basedir, 'package.json');

  if (exists(filename)) {
    var pkg = require(filename);
    if (pkg.webpackOptions)
      return pkg.webpackOptions;
  }
}

/**
 * Read webpack compiler options from webpack.config.js module
 *
 * @param {String} basedir
 */
function configureFromWebpackConfig(basedir) {
  var filename = join(basedir, 'webpack.config.js');

  if (exists(filename)) {
    return require(filename);
  }
}

function memoryFileSystemFromCompiler(compiler) {
  if (compiler.outputFileSystem instanceof MemoryOutputFileSystem) {
    return new MemoryInputFileSystem(compiler.outputFileSystem.data);
  }
}

/**
 * Merge objects into a single object key by key, overriding previous keys.
 */
function mergeOptions() {
  var result = {};
  Array.prototype.slice.call(arguments).forEach(function(src) {
    if (!src) {
      return;
    }
    for (var k in src) {
      // XXX: implement custom merge strategies for plugins, loaders, ...
      result[k] = src[k];
    }
  });
  return result;
}

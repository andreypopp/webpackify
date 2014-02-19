"use strict";

var fs                      = require('fs');
var exists                  = fs.existsSync;
var path                    = require('path');
var join                    = path.join;

var utils                   = require('lodash');
var webpack                 = require('webpack');
var Compiler                = require('webpack/lib/Compiler');
var NodeEnvironmentPlugin   = require('webpack/lib/node/NodeEnvironmentPlugin');
var WebpackOptionsApply     = require('webpack/lib/WebpackOptionsApply');
var WebpackOptionsDefaulter = require('webpack/lib/WebpackOptionsDefaulter');
var MemoryOutputFileSystem  = require('webpack/lib/MemoryOutputFileSystem');
var MemoryInputFileSystem   = require('enhanced-resolve/lib/MemoryInputFileSystem');
var createConstructor       = require('construct-from-spec');

var constructPlugin         = createConstructor('plugin', true);

module.exports = webpackify;

/**
 * webpackify configurator for webpack compiler
 *
 * @param {String} context
 * @param {Object} options
 */
function webpackify(context, options) {
  if (utils.isObject(context)) {
    options = context;
  } else {
    options = options || {};
    options.context = context;
  }

  options = mergeOptions(
      configureDefaults(),
      configureFromPackageMetadata(options.context),
      configureFromWebpackConfig(options.context),
      options
  );

  options.plugins = resolvePlugins(options.plugins, context);

	var compiler = new Compiler();
	compiler.options = options;
	compiler.options = new WebpackOptionsApply().process(options, compiler);
	new NodeEnvironmentPlugin().apply(compiler);

  // setup memory filesystem in case we don't have output defined
  if (options.output.memory) {
    compiler.outputFileSystem = new MemoryOutputFileSystem({});
    compiler.outputPath = '/';
  }

  var run = compiler.run.bind(compiler);
  var watch = compiler.watch.bind(compiler);

  compiler.run = function(cb) {
    run(function(err, stats) {
      if (err) return cb(err);
      stats.fs = getOutputFileSystem(compiler);
      cb(null, stats);
    });
  };

  compiler.watch = function(delay, cb) {
    watch(function(err, stats) {
      if (err) return cb(err);
      stats.fs = getOutputFileSystem(compiler);
      cb(null, stats);
    });
  }

  return compiler;
}

/**
 * Provide default options
 */
function configureDefaults() {
  var options = {bail: true};
  new webpack.WebpackOptionsDefaulter().process(options);
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

/**
 * Get output filesystem from the compiler
 *
 * @param {Compiler} compiler
 */
function getOutputFileSystem(compiler) {
  if (compiler.outputFileSystem instanceof MemoryOutputFileSystem) {
    return new MemoryInputFileSystem(compiler.outputFileSystem.data);
  }
  return compiler.outputFileSystem;
}

function resolvePlugins(plugins, context) {
  if (!plugins) return [];
  return plugins.map(function(p) {
    return p.constructor === Object ? constructPlugin(p, context) : p;
  });
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
      switch (k) {
        case 'output':
          result[k] = utils.merge({}, result[k], src[k]);
          break;
        case 'plugins':
          result[k] = [].concat(result[k]).concat(src[k]).filter(Boolean);
          break;
        default:
          result[k] = src[k];
      }
    }
  });
  return result;
}

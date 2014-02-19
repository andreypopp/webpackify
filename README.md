# webpackify

An opinionated interface to [webpack][] compiler. Provides:

  * An intuitive and documented command line interface which handles errors
    gracefully and provides tips and references to the documentation. (in progress)

  * Streaming to stdout if output contains only a single file. (implemented)

  * Loading configuration from `"webpackOptions"` field of `package.json` in
    addition to `webpack.config.js` and configuration via command line options.
    (implemented)

  * Plugins can be specified as specs (w/o code):

    ```
    plugins: [
      {
        plugin: 'webpack/lib/optimize/CommonsChunkPlugin',
        filenameTemplate: 'common.js'
      },
      ...
    ]
    ```

  * Package-scoped loaders, similar to how browserify runs transforms. (not
    implemented)

  * Support for running browserify transforms. (not implemented)


## Installation

    % npm install webpackify

## Usage

Basic usage is:

    % webpackify main.js > bundle.js

Run with `--help` for more information:

    % webpackify --help

[webpack]: http://webpack.github.io/

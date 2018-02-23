'use strict';
const gulp = require('gulp');
const connect = require('gulp-connect');
const lighthouse = require('lighthouse');
const log = require('lighthouse-logger');
const chromeLauncher = require('chrome-launcher');
const LightHouseConfig = require('./lighthouse.config.js');
const { write } = require('lighthouse/lighthouse-cli/printer');
const PORT = 8865;

/**
 * Start server
 */
const startServer = function() {
  return connect.server({
    root: '../CalendarWebApp',
    port: PORT,
  });
};

/**
 * Stop server
 */
const stopServer = function() {
  connect.serverClose();
};

/**
 * Run lighthouse
 */
function launchChromeAndRunLighthouse(url, flags, config = null) {
  return chromeLauncher.launch().then(chrome => {
    flags.port = chrome.port;
    return lighthouse(url, flags, config).then(results =>
      chrome.kill().then(() => results)
    );
  });
}

/**
 * Handle ok result
 * @param {Object} results - Lighthouse results
 */
const handleOk = function(results) {
  stopServer();
  write(results, 'html', 'report.html');
  // Throw Error if score falls below a certain threshold.
  if (results.audits['first-meaningful-paint'].rawValue > 3000) {
    console.log(`Warning: Time to first meaningful paint ${results.audits['first-meaningful-paint'].displayValue}`);
    process.exit(1);
  }
  return results;
};

/**
 * Handle error
 */
const handleError = function(e) {
  stopServer();
  console.error(e);
  throw e; // Throw to exit process with status 1.
};

// available options - https://github.com/GoogleChrome/lighthouse/#cli-options
const flags = {
  saveAssets: true,
  port: 0,
  disableDeviceEmulation: true,
  disableCPUThrottling: true,
  disableNetworkThrottling: true,
  logLevel: 'info',
  output: ['--output html --output-path ./report.html']
};

// Set log level.
log.setLevel(flags.logLevel);

// You can pass perfConfig as third parameter to generate report only for performance
// also you can write your custome config. https://github.com/GoogleChrome/lighthouse/tree/master/docs/recipes/custom-audit
gulp.task('lighthouse', function() {
  startServer();
  return launchChromeAndRunLighthouse(`http://localhost:${PORT}/index.html`, flags, LightHouseConfig)
    .then(handleOk)
    .catch(handleError);
});

gulp.task('default', ['lighthouse']);
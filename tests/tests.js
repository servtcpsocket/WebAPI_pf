(function(window) {

  'use strict';

  // So far tests are going just to write on console.log... if we want something
  // nicer this would be a good place to add it...
  var logExitElement = document.getElementById('test_log');
  var _domUtils = window.DOMUtils;

  window.Tests = {
    log: function(test, text) {
      var logText = '--**-- ' + test + ': ' + text;
      if (logExitElement && _domUtils) {
        _domUtils.addText(logExitElement, logText);
        _domUtils.createElementAt(logExitElement, 'br');
      } else {
        //  By default, just log it
        console.log(logText);
      }
      return true; // So we can chain this...
    },
    abort: function(e) {
      throw e;
    }
  };

  function runTest(serviceToTest) {
    // When the js loads, window.Tests[xxx] holds a promise
    // that fulfills when the dependencies have been loaded. So...
    LazyLoader.load([serviceToTest + '.js']).
      then(() =>
           LazyLoader.dependencyLoad(window.Tests[serviceToTest].dependencies),
          e => {
            window.Tests.log('Main: Error loading ' + serviceToTest + '.js. ' + JSON.stringify(e));
          }).
      then(() => window.Tests[serviceToTest].runTest());
  }

  window.addEventListener('load', function () {
    // Hopefully this will be false at some point in life...
    var loadNavConnectPolyfill = !navigator.connect;
    var allLoaded;
    var confLoaded = LazyLoader.getJSON('test_list.json');
    if (loadNavConnectPolyfill) {
      allLoaded = LazyLoader.
                    load(['/WebAPI_pf/polyfills/nav_connect/' +
                          'navigator_connect.js']);
    } else {
      allLoaded = Promise.resolve();
    }
    Promise.all([confLoaded, allLoaded]).then(values => {
      var testButtons = document.getElementById('test_list');
      for (var testName in values[0]) {
      var button = _domUtils.createElementAt(testButtons, 'button',
                                             { id: testName,
                                               class: 'menu-option'
                                             }, testName);
        button.addEventListener('click', runTest.bind(undefined, testName));
      }
    });
  });
})(window);

(function(window) {

  'use strict';

  // So far tests are going just to write on console.log... if we want something
  // nicer this would be a good place to add it...
  window.Tests = {
    log: function(test, text) {
      console.log('--**-- ' + test + ': ' + text);
      return true; // So we can chain this...
    }
  };

  function runTest(serviceToTest) {
    // When the js loads, window.Tests[xxx] holds a promise
    // that fulfills when the dependencies have been loaded. So...
    LazyLoader.load([serviceToTest + '.js']).
      then(() => window.Tests[serviceToTest]).
      then(test => test.runTest());
  }

  window.addEventListener('load', function () {
    // Hopefully this will be false at some point in life...
    var loadNavConnectPolyfill = !navigator.connect;
    var allLoaded;
    if (loadNavConnectPolyfill) {
      allLoaded = LazyLoader.
                    load(['/WebAPI_pf/polyfills/nav_connect/' +
                          'navigator_connect.js']);
    } else {
      allLoaded = Promise.resolve();
    }
    allLoaded.then(() => {
      var settings = document.querySelector('#settings');
      var tcpsocket = document.querySelector('#tcpsocket');
      settings.addEventListener('click', runTest.bind(undefined, 'settings'));
      tcpsocket.addEventListener('click', runTest.bind(undefined, 'tcpsocket'));
    });
  });
})(window);

// mozSettings API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  window.Tests['settings'] = {
    dependencies: [
      '/WebAPI_pf/polyfills/common/webapi_poly_common.js',
      '/WebAPI_pf/polyfills/settings/settings.js'
    ],

    runTest: function() {
      var log = window.Tests.log.bind(undefined, 'settings');
      var abort = window.Tests.abort;

      try {
        log('Starting settings polyfill tests');
        window.navigator.mozSettings || abort('window.navigator.mozSettings not defined.');

        var _mozSett = window.navigator.mozSettings;

        log('window.navigator.mozSettings defined!');
        var lock = _mozSett.createLock();

        lock && log('We got a lock!') &&
          (lock.serialize && log('And it\'s fake!')) ||
          abort('And it\'s a real one... Done!');

        // Going to kill two stones with a bird. Or something... :P
        _mozSett.addObserver('i.am.a.setting', function(e) {
          log('Got a event for my setting: ' + JSON.stringify(e));
         });

        lock.set({'i.am.a.setting': 'abcd1234'}).then(() => {
          log('Setting set! (hopefully)');
        });
        lock.get('i.am.a.setting').then(e => {
          log('Setting read! ' + JSON.stringify(e));
        });

      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };

})(window);

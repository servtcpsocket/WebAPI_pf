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
        window.navigator.mozSettings ||
          abort('window.navigator.mozSettings not defined.');

        var _mozSett = window.navigator.mozSettings;

        log('window.navigator.mozSettings defined!');
        var lock = _mozSett.createLock();

        lock && log('We got a lock!') &&
          (lock.serialize && log('And it\'s fake!')) ||
          abort('And it\'s a real one... Done!');

        // Going to kill two stones with a bird. Or something... :P
        log('Adding observer over not allowed setting [i.am.not.allowed]');
        _mozSett.addObserver('i.am.not.allowed.setting',
           e => log('Got a event for [i.am.not.allowed]: ' +JSON.stringify(e)));
        log('Adding observer over setting allowed [locale.hour12]');
        _mozSett.addObserver('locale.hour12', function(e) {
           log('Got a event for [locale.hour12] setting: ' + JSON.stringify(e));
        });

        log('Setting not allowed setting [i.am.not.allowed]');
        lock.set({'i.am.not.allowed.setting': 'abcd1234'}).then(() => {
          log('Setting [i.am.not.allowed] set! (That\'s bad!)');
        });
        log('Setting allowed setting [locale.hour12]');
        lock.set({'locale.hour12': false}).then(() => {
          log('Setting [locale.hour12] set! (hopefully)');
        });
        log('Getting not allowed setting [i.am.not.allowed]');
        lock.get('i.am.not.allowed.setting').then(e => {
          log('Setting [i.am.not.allowed] read! (That\'s bad!)' +
              JSON.stringify(e));
        });
        log('Getting allowed setting [locale.hour12]');
        lock.get('locale.hour12').then(e => {
          log('Setting [locale.hour12] read! ' + JSON.stringify(e));
        });

      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };

})(window);

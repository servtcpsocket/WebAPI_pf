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
        window.navigator.mozTCPSocket ||
          abort('window.navigator.mozTCPSocket not defined.');

        var _mozTCPSocket = window.navigator.mozTCPSocket;

        log('window.navigator.mozTCPSocket defined!');
        var host = '192.168.2.24';
        var port = 12345;
        var options = {};
        var socket = _mozTCPSocket.open(host, port, options);

        socket && log('We got a socket!') &&
          (socket.serialize && log('And it\'s fake!')) ||
          abort('And it\'s a real one... Done!');

        socket.ondata = function(data) {
          log("Got some data: " + data);
        };

        socket.send('Hi there');

      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };

})(window);

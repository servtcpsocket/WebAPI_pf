// mozSettings API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  window.Tests['tcpsocket'] = {
    dependencies: [
      '/WebAPI_pf/polyfills/common/webapi_poly_common.js',
      '/WebAPI_pf/polyfills/tcpsocket/tcpsocket.js'
    ],

    runTest: function() {
      var log = window.Tests.log.bind(undefined, 'tcpsocket');
      var abort = window.Tests.abort;

      try {
        log('Starting tcpsocket polyfill tests');
        window.navigator.mozTCPSocket ||
          abort('window.navigator.mozTCPSocket not defined.');

        var _mozTCPSocket = window.navigator.mozTCPSocket;

        log('window.navigator.mozTCPSocket defined!');
        var host = '192.168.1.10';
        var port = 12345;
        var options = {};
        log('Starting test');
        var socket = _mozTCPSocket.open(host, port, options);

        socket && log('We got a socket!') &&
          (socket.serialize && log('And it\'s fake!')) ||
          abort('And it\'s a real one... Done!');

        socket.onopen = function() {
          log("Socket opened!");
          socket.ondata = function(data) {
              log("Got some data: " + JSON.stringify(data));
          };

          socket.send('Hi there');
        };

      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };

})(window);

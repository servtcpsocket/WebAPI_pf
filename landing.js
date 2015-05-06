(function(window) {
  function installServices() {
    var origin = document.location.origin;
    // Could get this from the href but not really worth the hassle
    var relPath = '/WebAPI_pf/services/';
    var services = [
      'tcpsocket',
      'settings',
      'fm'
    ];
    function installApp(i) {
      navigator.mozApps.install(origin + relPath + services[i] +
                                '/manifest.webapp').
        then(() => {
          if (++i < services.length) {
            installApp(i);
          }
        });
    }
    installApp(0);
  }

  function launchTests() {
    var origin = document.location.origin;
    // Could get this from the href but not really worth the hassle
    navigator.mozApps.install(origin + '/WebAPI_pf/tests/manifest.webapp');
  }

  // Testing purpose only!!!!
  window.addEventListener('load', function () {
    console.log('Adding handlers for buttons');
    var install = document.querySelector('#install');
    var tests = document.querySelector('#tests');
    install.addEventListener('click', installServices);
    tests.addEventListener('click', launchTests);
  });
})(window);

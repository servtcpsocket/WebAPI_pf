(function(window) {
  function install() {
    var origin = document.location.origin;
    // Could get this from the href but not really worth the hassle
    var relPath = '/WebAPI_pf/services/';
    var services = [
      'tcpsocket',
      'settings',
      'fm'
    ];
    services.forEach(service => {
      navigator.mozApps.install(origin + relPath + service + '/manifest.webapp');
    });
  }

  function tests() {
    window.open("/tests/index.html");
  }

  // Testing purpose only!!!!
  window.addEventListener('load', function () {
    var install = document.querySelector('#install');
    var tests = document.querySelector('#tests');
    install.addEventListener('click', install);
    tests.addEventListener('click', tests);
  });
})(window);

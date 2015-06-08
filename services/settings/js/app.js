(function(window) {
  'use strict';

  function debug(str) {
    console.log('SettingsService -*-:' + str);
  }

  // Ok, this kinda sucks because most APIs (and settings is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _locks = {};
  var _observers = {};
  var _settings = navigator.mozSettings;

  function buildDOMRequestAnswer(operation, channel, request) {
    debug('Building call --> ' + JSON.stringify(request));
    var remotePortId = request.remotePortId;
    var reqId = request.remoteData.id;
    var opData = request.remoteData.data.params || [];
    var requestOp = request.remoteData.data;

    // It's either a get or a set... or an error but let's assume it isn't :P
    if (_locks[requestOp.lockId].closed) {
      _locks[requestOp.lockId] = _settings.createLock();
    }

    _locks[requestOp.lockId][operation](...opData).then(result => {
      channel.postMessage({
        remotePortId: remotePortId,
        data: { id : reqId, result: result}}
      );
    });
  }

  function setHanlder(operation, channel, request) {
    var remotePortId = request.remotePortId;
    var reqId = request.remoteData.id;
    var requestOp = request.remoteData.data;

    function observerTemplate(evt) {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          event: {
            settingName: evt.settingName,
            settingValue: evt.settingValue
          }
        }
      });
    }

    if (operation === 'addObserver') {
      _observers[reqId] = observerTemplate;
      _settings.addObserver(requestOp.settingName, _observers[reqId]);
    } else {
      _settings.onsettingchange = observerTemplate;
    }
  }

  var _operations = {
    createLock: function(channel, request) {
      var remotePortId = request.remotePortId;
      var reqId = request.remoteData.id;
      _locks[reqId] = _settings.createLock();
      // Let's assume this works always..
      channel.postMessage({remotePortId: remotePortId, data: {id: reqId}});
    },

    addObserver: setHanlder.bind(undefined, 'addObserver'),

    removeObserver: function(channel, request) {
      var reqId = request.remoteData.id;
      var requestOp = request.remoteData.data;
      _settings.removeObserver(requestOp.settingName,
        _observers[requestOp.observerId]);
    },

    onsettingschange: setHanlder.bind(undefined, 'onsettingschange'),

    get: buildDOMRequestAnswer.bind(this, 'get'),

    set: buildDOMRequestAnswer.bind(this, 'set')
  };

  var processSWRequest = function(aAcl, aChannel, aEvt) {
    // We can get:
    // * createLock
    // * addObserver
    // * removeObserver
    // * lock.set || lock.get
    // All the operations have a requestId, and the lock operations also include
    // a lock id.
    var request = aEvt.data.remoteData;
    var requestOp = request.data.operation;
    var targetURL = aEvt.data.targetURL;

    var forbidCall = function(constraints) {
      var settings = [];
      switch(requestOp) {
        case 'addObserver':
        case 'removeObserver':
          settings = [request.data.settingName];
          break;
        case 'set':
          settings = Object.keys(request.data.params[0]);
          break;
        case 'get':
          settings = request.data.params;
          break;
      }
      return !settings.every(setting => constraints.indexOf(setting) >= 0);
    };

    if (window.ServiceHelper.isForbidden(aAcl, targetURL, requestOp,
                                         forbidCall)) {
      return;
    }

    debug('processSWRequest --> processing a msg:' +
          (aEvt.data ? JSON.stringify(aEvt.data): 'msg without data'));
    if (requestOp in _operations) {
      _operations[requestOp] &&
        _operations[requestOp](aChannel, aEvt.data);
    } else {
      console.error('Settings service unknown operation:' + requestOp);
    }
  };

  window.addEventListener('load', function () {
    if (window.ServiceHelper) {
      debug('APP serviceWorker in navigator');
      window.ServiceHelper.register(processSWRequest);
    } else {
      debug('APP navigator does not have ServiceWorker');
      return;
    }
  });

})(window);

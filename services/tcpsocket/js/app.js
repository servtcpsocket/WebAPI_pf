(function(window) {
  'use strict';

  function debug(str) {
    console.log('TCPSocketService -*-:' + str);
  }

  // Ok, this kinda sucks because most APIs (and settings is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _tcpSocket = navigator.mozTCPSocket;

  var _internalSockId = 0;
  var _sockets = {};
  var _observers = {};


  // request structure:
  // {
  //    remotePortId: portToSWClientBridge
  //    remoteData: dataReceivedFromClient
  //
  // }


  function setHandler(eventType, channel, request) {
    var socketId = request.remoteData.socketId;
    var remotePortId = request.remotePortId;

    function handlerTemplate(evt) {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: request.id,
          data: evt.data
        }
      });
    }

  }

  var _operations = {
    open: function(channel, request) {
      var funcData = request.remoteData.data;
      _sockets[++_internalSockId] =
        _tcpSocket.open(funcData.host, funcData.port, funcData.options);
      // And let's assume everything goes well
      channel.postMessage({
        remotePortId: request.remotePortId,
        data: {
          id: request.remoteData.id,
          socketId: _internalSockId
        }
      });
    },
    send: function(channel, request) {
    },
    resume: function(channel, request) {
    },
    close: function(channel, request) {
    },
    upgradeToSecure: function(channel, request) {
    }
  };
  ['open', 'drain', 'data', 'error', 'close'].forEach(event => {
    _operations['on' + event] = setHandler.bind(undefined, event);
  });

  var processSWRequest = function(channel, evt) {


    var remotePortId = evt.data.remotePortId;
    var request = evt.data.remoteData;
    var requestOp = request.data;

    _operations[requestOp.operation] &&
      _operations[requestOp.operation](evt.data);

    if (requestOp.operation === 'createLock') {
      _locks[request.id] = _settings.createLock();
      // Let's assume this works always..
      channel.postMessage({remotePortId: remotePortId, data: {id: request.id}});
    } else if (requestOp.operation === 'addObserver') {
      _observers[request.id] = observerTemplate;
      _settings.addObserver(requestOp.settingName, _observers[request.id]);
    } else if (requestOp.operation === 'removeObserver') {
      _settings.removeObserver(_observers[request.id]);
    } else if (requestOp.operation === 'onsettingschange') {
      _settings.onsettingchange = observerTemplate;
    } else {
      // It's either a get or a set... or an error but let's assume it isn't :P
      if (_locks[requestOp.lockId].closed) {
        _locks[requestOp.lockId] = _settings.createLock();
      }

      _locks[requestOp.lockId][requestOp.operation](requestOp.settings).
        then(result => {
          channel.postMessage({
            remotePortId: remotePortId,
            data: { id : request.id, result: result}}
          );
      });
    }
  };


  // Testing purpose only!!!!
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

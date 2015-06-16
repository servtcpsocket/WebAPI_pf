(function(window) {
  'use strict';

  function debug(str) {
    console.log('DeviceStorageService -*-:' + str);
  }

  // Ok, this kinda sucks because most APIs (and settings is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var _deviceStorages = {};
  var _listeners = {};

  function addEventTargetEvent(channel, request) {
    var requestOp = request.remoteData.data;
    var reqId = request.remoteData.id;
    var deviceStorageId = requestOp.deviceStorageId;

    function listenerTemplate(evt) {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          event: window.ServiceHelper.cloneObject(evt)
        }
      });
    }

    _listeners[reqId] = listenerTemplate;
    _deviceStorages[deviceStorageId].addEventListener(requestOp.type,
      _listeners[reqId], requestOp.useCapture);
  }

  function buildDOMCursorAnswer(operation, channel, request) {
    var remotePortId = request.remotePortId;
    // Params for the local operation:
    var opData = request.remoteData.data.params || [];
    var reqId = request.remoteData.id;
    var deviceStorageId = request.remoteData.data.deviceStorageId;

    // Remove tailing undefines
    for (var i = opData.length -1; i >= 0 &&
      opData[i] === undefined && !opData.pop(); i--);

    // Trick: if we pass [undefined, options] as parameters to enumerate or
    // enumerateEditable, the method will crash, so we must remove
    // the first undefined param
    if (opData.length > 0 && typeof opData[0] === 'undefined') {
      opData.shift();
    }
    
    // FIX-ME: Due to the way FakeDOMCursorRequest is implemented, we
    // have to return all the fetched data on a single message
    var cursor = _deviceStorages[deviceStorageId][operation](...opData);
    var files = [];

    cursor.onsuccess = () => {
      if (!cursor.done) {
        cursor.result && files.push(cursor.result);
        cursor.continue();
      } else {
        // Send message
        channel.postMessage({
          remotePortId: remotePortId,
          data: { id : reqId, result: files}}
        );
      }
    };

    cursor.onerror = () => {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id : reqId,
          error: window.ServiceHelper.cloneObject(cursor.error)
        }}
      );
    };
  }

  function buildDOMRequestAnswer(operation, channel, request) {
    debug('Building call --> ' + JSON.stringify(request));
    var remotePortId = request.remotePortId;
    // Params for the local operation:
    var opData = request.remoteData.data.params || [];
    var reqId = request.remoteData.id;
    var deviceStorageId = request.remoteData.data.deviceStorageId;

    _deviceStorages[deviceStorageId][operation](...opData).then(result => {
      channel.postMessage({
        remotePortId: remotePortId,
        data: { id : reqId, result: result}}
      );
    }).catch(error => {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id : reqId,
          error: window.ServiceHelper.cloneObject(error)
        }}
      );
    });
  }

  function setHandler(eventType, channel, request) {
    var remotePortId = request.remotePortId;
    var reqId = request.remoteData.id;
    var deviceStorageId = request.remoteData.data.deviceStorageId;

    function observerTemplate(evt) {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: reqId,
          event: {
            path: evt.path,
            reason: evt.reason
          }
        }
      });
    }

    _deviceStorages[deviceStorageId][eventType] = observerTemplate;
  }

  var _operations = {
    getDeviceStorage: function(channel, request) {
      var remotePortId = request.remotePortId;
      var reqId = request.remoteData.id;
      var opData = request.remoteData.data.params || [];
      var requestOp = request.remoteData.data;

      var deviceStorages = navigator.getDeviceStorages(...opData);
      deviceStorages.forEach(ds => {
        if (ds.storageName === requestOp.storageName) {
          _deviceStorages[reqId] = ds;
          return;
        }
      });
      // Let's assume this works always...
      channel.postMessage({remotePortId: remotePortId, data: {id: reqId}});
    },

    addEventListener: addEventTargetEvent.bind(this),

    removeEventListener: function(channel, request) {
      var requestOp = request.remoteData.data;
      var deviceStorageId = requestOp.deviceStorageId;
      _deviceStorages[deviceStorageId].
        removeEventListener(_listeners[requestOp.listenerId]);
    },

    dispatchEvent: function(channel, request) {
      var requestOp = request.remoteData.data;
      var deviceStorageId = requestOp.deviceStorageId;
      _deviceStorages[deviceStorageId].dispatchEvent(requestOp.event);
    },

    enumerate: buildDOMCursorAnswer.bind(this, 'enumerate'),

    enumerateEditable: buildDOMCursorAnswer.bind(this, 'enumerateEditable'),

    onchange: setHandler.bind(undefined, 'onchange')
  };

  ['add', 'addNamed',
    'available', 'delete',
    'freeSpace', 'get',
    'getEditable', 'usedSpace'].forEach(method => {
      _operations[method] = buildDOMRequestAnswer.bind(undefined, method);
  });

  var processSWRequest = function(aAcl, aChannel, aEvt) {
    // We can get:
    // * methodName
    // * onchange
    // * getDeviceStorage
    // * addEventListener
    // * removeEventListener
    // * dispatchEvent
    var request = aEvt.data.remoteData;
    var requestOp = request.data.operation;
    var targetURL = aEvt.data.targetURL;

    // TODO: Add resource access constraint
    // It should return true if resource access is forbidden,
    // false if it's allowed
    var forbidCall = function(constraints) {
      return false;
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
      console.error('DeviceStorage service unknown operation:' + requestOp);
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

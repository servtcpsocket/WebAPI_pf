// navigator.mozSettings polyfill!
// https://developer.mozilla.org/en-US/docs/Web/API/Navigator/mozSettings

// I have to define the service protocol, and this is as good place as any. The
// protocol will be as follows:
// * Each request will have a numeric request id, set by the client
// * The answers will include the request id, so the client can know to which
//   request the answer corresponds
// * The request id will also act as identifier for remote objects (locks and
//  observers!)

// createLock =>
//   * Request: { id: requestId, data: {operation: 'createLock' }}
//   * Answer:  { id: requestId, error: error}
//     (answer.error truthy means there was an error)
// Once you get an answer you can assume than the id is the identifier of the
// remote lock

// For all the operations over a lock (set and get):
//  * Request: { id: requestId,
//               data: {
//                 lockId: lockId,
//                 operation: 'set'|'get',
//                 settings: settings
//               }
//             }
// * Answer: { id: requestId,
//             result|error: Whatever }

// For the addOBserver operation
//  Request: { id: requestId,
//             data: {
//             operation: 'addObserver',
//             settingName: setting
//           },
// Answer: Will be invoked when there's activity with the MozSettingsEvent (like) object:
//    { id: requestId,
//      data: mozSettingsEvent }


(function(window) {

  function debug(t) {
    console.log(t);
  }

  if (window.navigator.mozSettings) {
    // Hmm it's already available... so let's just use it and be done with it
    return;
  }

  // Wishful thinking at the moment...
  const SETTINGS_SERVICE = 'https://settingsservice.gaiamobile.org';

  // It's nice being monothread...
  var _currentRequestId = 1;

  // SettingsLock polyfill..
  function FakeSettingsLock() {

    var _resolve, _reject;
    var _lock = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });

    // This will hold the remote object, once the lock is actually created..
    var _lockId = null;
    _lock.then(id => _lockId = id);

    // If this is not null, all the gets and sets will return a Request that
    // will fail with the error set on _permaError
    var _permaFail = null;

    this.closed = false;

    var _serializeRequest = function(data) {
      // When this is executed the promise should have resolved and thus we
      // should have this
      data.lockId = _lockId;
      return {
        id: ++_currentRequestId,
        data: data,
        processAnswer: function(answer) {
          if (answer.error) {
            this._fireError(answer.error);
          } else {
            this._fireSuccess(answer.result);
          }
        }
      };
    };

    function _createAndQueueRequest(data) {
      var request = new FakeDOMRequest();
      request.serialize = _serializeRequest.bind(request, data);
      Promise.all([navConnPromise, _lock]).then(values => values[0].sendObject(request));
      return request;
    }

    this.set = function(settings) {
      return _createAndQueueRequest({
        operation: 'set',
        settings: settings
      });
    };

    this.get = function(settings) {
      return _createAndQueueRequest({
        operation: 'get',
        settings: settings
      });
    };

    this._serialize = function() {
      return {
        id: ++_currentRequestId,
        data: {
          operation: 'createLock'
        },
        processAnswer: function(answer) {
          if (!answer.error) {
            _resolve(answer._id);
          } else {
            _permaFail = 'Error creating lock: ' + answer.error;
            _reject(_permaFail);
          }
        }
      };
    };
  }

  // Returns a SettingsLock object to safely access settings asynchronously.
  // Note that the lock might be created and yet everything fail on it...
  var createLock = function() {
    var lock = new FakeSettingsLock();
    navConnPromise.then(navConnHelper => navConnHelper.sendObject(lock));
    return lock;
  };


  // _observers[setting][function] => undefined or an Observer object
  var _observers = {};

  // And this is something else that might be reusable...
  function Observer(setting, callback) {
    this._id = null;
    this.serialize = () => {
      if (!this._id) {
        this._id = ++_currentRequestId;
      }
      return {
        id: this._id,
        data: {
          operation: 'addObserver',
          settingName: setting
        },
        processAnswer: answer => callback(answer.result)
      };
    };
  }

  function ObserverRemoval(observer) {
    this.serialize = () => {
      return {
        id: observer._id,
        data: {
          operation: 'removeObserver',
          settingName: setting
        }
      };
    };
  }

  // Allows to bind a function to any change on a given settings
  var addObserver = function(setting, callback) {
    var observer = new Observer(callback);
    _observers[setting][callback] = observer;
    navConnPromise.then(navConnHelper => navConnHelper.sendObject(observer));
  };

  // Allows to unbind a function previously set with addObserver.
  var removeObserver = function(setting, callback) {
    if (!_observers[setting][callback]) {
      return;
    }
    var obRemoval = new ObserverRemoval(_observers[setting][callback]);
    navConnPromise.then(navConnHelper => navConnHelper.sendObject(obRemoval));
    delete _observers[setting][callback];
  };


  // This will have to be a SettingsManager object...
  // Note that since mozSettings constructor is synchronous but we can't make
  // this synchronous, this has an unfortunate difference where the object might
  // disappear later.
  window.navigator.mozSettings = {
    createLock: createLock,
    addObserver: addObserver,
    removeObserver: removeObserver
  };

  Object.defineProperty(window.navigator.mozSettings, 'onsettingschange', {
    set: function(cb) {
      this._onsettingschange = cb;
      this._onsettingschangeId = this._onsettingschangeId || ++_currentRequestId;
      var commandObject = {
        serialize: function() {
          return {
            id: ++_currentRequestId,
            data: {
              operation: 'onsettingschange'
            },
            processAnswer: answer => cb(answer.result)
          };
        }
      };
      navConnPromise.then(navConnHelper => navConnHelper.sendObject(commandObject));
    }
  });

  var navConnPromise = new NavConnectHelper();

  navConnPromise.then(function(){}, e => {
    debug('Got an exception while connecting ' + e);
    window.navigator.mozSettings.createLock = null;
    window.navigator.mozSettings.addObserver = null;
    window.navigator.mozSettings.removeObserver = null;
    window.navigator.mozSettings = null;
  });

  ////////////////////////////////////////////////////////////////////////////////
  // Can move this to a separate file once we have another use case for it...
  ////////////////////////////////////////////////////////////////////////////////
  function NavConnectHelper(errorHandler) {

    return new Promise((resolve, reject) => {
      // navigator.connect port with the settings service, when the connection is established.
      var _port = null;

      var _messageHandlers = {};

      var _getHandler = function(evt) {
        return evt && evt.data && _messageHandlers[evt.data.id] &&
          typeof _messageHandlers[evt.data.id] == 'function' &&
          _messageHandlers[evt.data.id];
      };

      navigator.connect(SETTINGS_SERVICE).then(port => {
        debug('Successfuly established connection to ' + SETTINGS_SERVICE);
        _port = port;
        port.onmessage = function (evt) {
          var handler = _getHandler(evt);
          if (!handler) {
            debug('Huh? Got an message with ' + JSON.stringify(evt.data) +
                  ' that I don\'t know what to do with. Discarding!');
            return;
          }
          handler(evt.data);
        };

        var realHandler = {
          // aObject MUSTt implement a serialize method, and the serialize
          // method MUST return an object with the following structure:
          //  {
          //    id: A numeric identifier for this operation
          //    data: Some extra data that the server will need
          //    processAnswer: a function that will process the answer for this message
          // }
          sendObject: function(aObject) {
            var serialized = aObject.serialize();
            _messageHandlers[aObject.id] = aObject.processAnswer;
            _port.postMessage({id: serialized.id, data: serialized.data});
          }
        };

        resolve(realHandler);
      }).catch(error => reject(error));
    });
  }



  // This should probably be on a common part...
  // Implements something like
  // http://mxr.mozilla.org/mozilla-central/source/dom/base/nsIDOMDOMRequest.idl
  // Well, *expletive removed* me sideways, now DOMRequests are promises also!
  function FakeDOMRequest(extraData) {
    var _result = null;
    var _error = null;
    var self = this;
    var _fired = false;
    var _resolve, _reject;
    var internalPromise = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });

    this.then = function (cbresolve, cbreject) {
      return internalPromise.then(cbresolve, cbreject);
    };

    Object.defineProperty(this, 'result', {
      get: function() {
        return _result;
      }
    });

    Object.defineProperty(this, 'error', {
      get: function() {
        return _error;
      }
    });

    this._fireSuccess = function(result) {
      if (_fired) {
        _result = result;
        _resolve(result);
        this.onsuccess && typeof this.onsuccess = 'function' && this.onsuccess();
      }
    };

    this._fireError = function(error) {
      if (_fired) {
        _error = error;
        _reject(error);
        this.onerror && typeof this.onerror = 'function' && this.onerror(error);
      }
    };
  }


})(window);

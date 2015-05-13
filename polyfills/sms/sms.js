// navigator.mozMobileMessage polyfill!
// https://developer.mozilla.org/en-US/docs/Web/API/MozMobileMessageManager
// It's better to look directly the idl
// https://mxr.mozilla.org/mozilla-central/source/dom/webidl/MozMobileMessageManager.webidl
// because the documentation at developer.mozilla.org is not always up to date

(function(exports) {

  'use strict';

  // If it's really available you don't need this
  if (exports.navigator.mozMobileMessage) {
    return;
  }

  function debug(text) {
    console.log('*-*-*- SMS PF: ' + text);
  }

  var SMS_SERVICE = 'https://smsservice.gaiamobile.org';

  var _currentRequestId = 1;

  // Note to self: This is used on almost all the polyfills... move to common?
  function _createAndQueueRequest(data, constructor) {
    var request = new constructor(++_currentRequestId, data);
    navConnHelper.then(navConn => navConn.sendObject(request));
    return request;
  }


  var _smsOps = {
    /**
     * Send SMS.
     *
     * @param number
     *        Either a DOMString (only one number) or an array of numbers.
     * @param text
     *        The text message to be sent.
     * @param sendParameters
     *        A SmsSendParameters object.
     *
     * @return
     *        A DOMRequest object indicating the sending result if one number
     *        has been passed; an array of DOMRequest objects otherwise.
     *
     *  DOMRequest send(DOMString number,
     *                  DOMString text,
     *                  optional SmsSendParameters sendParameters);
     */
    send: {
      numParams: 3,
      returnValue: FakeDOMRequest
    },

    getMessage: {
      numParams: 1,
      returnValue: FakeDOMRequest
    },

    /**
      * DOMCursor getMessages(optional MobileMessageFilter filter,
      *                       optional boolean reverse = false);
      **/
    getMessages: {
      numParams: 2,
      returnValue: FakeDOMCursorRequest
    },

    /**
     * The parameter can be either a message id, or a Moz{Mms,Sms}Message, or an
     * array of Moz{Mms,Sms}Message objects
     *  DOMRequest delete(long id);
     *  DOMRequest delete(MozSmsMessage message);
     *  DOMRequest delete(MozMmsMessage message);
     *  DOMRequest
     *    delete(sequence<(long or MozSmsMessage or MozMmsMessage)> params);
     */
    delete: {
      numParams: 1,
      returnValue: FakeDOMRequest

    },

    getThreads: {
      numParams: 0,
      returnValue: FakeDOMCursorRequest
    },

    /**
     * DOMRequest markMessageRead(long id,
     *                            boolean read,
     *                            optional boolean sendReadReport = false);
     **/
    markMessageRead: {
      numParams:3,
      returnValue: FakeDOMRequest
    },

    retrieveMMS: {
      numParams: 1,
      returnValue: FakeDOMRequest
    },

    /**
     * Send MMS.
     *
     * @param parameters
     *        A MmsParameters object.
     * @param sendParameters
     *        A MmsSendParameters object.
     *
     * @return
     *        A DOMRequest object indicating the sending result.
     *
     *   DOMRequest sendMMS(optional MmsParameters parameters,
     *                      optional MmsSendParameters sendParameters);
     */
    sendMMS: {
      numParams: 2,
      returnValue: FakeDOMRequest
    },

    getSegmentInfoForText: {
      numParams: 1,
      returnValue: FakeDOMRequest
    }
  };

  var fakeMozMobileMessage = {

    addEventListener: function(evt, fc) {
      this['on' + evt] = fc;
    }

  };

  function methodCall(methodName, numParams, returnValue) {
    var params = [];
    // It's not recommended calling splice on arguments apparently.
    // Also, first three arguments are explicit
    for(var i = 3; i < numParams + 3; i++) {
      params.push(arguments[i]);
    }
    debug('Called ' + methodName + ' with ' + JSON.stringify(params));
      return _createAndQueueRequest({
        operation: methodName,
        params: params
      }, returnValue);
  }

  for(var _op  in _smsOps) {
    fakeMozMobileMessage[_op] =
      methodCall.bind(fakeMozMobileMessage, _op, _smsOps[_op].numParams,
                     _smsOps[_op].returnValue);
  }

  var _handlers = {
    ondeliveryerror: null,
    ondeliverysuccess: null,
    onreceived: null,
    onretrieving: null,
    onsent: null,
    onsending: null,
    onfailed: null
  };

  Object.keys(_handlers).forEach(handler =>
    Object.defineProperty(fakeMozMobileMessage, handler, {
      get: function() {
        return _handlers[handler];
      },
      set: function(cb) {
        _handlers[handler] = cb;
        navConnHelper.then(navConn => {
          var commandObject = {
            serialize: function() {
              return {
                id: ++_currentRequestId,
                data: {
                  operation: handler
                },
                processAnswer: answer => cb(answer.data.event)
              };
            }
          };
          navConn.sendObject(commandObject);
        });
      }
    })
  );

  debug('exports.navigator.mozMobileMessage: ' +
        (exports.navigator.mozMobileMessage ? 'exists' : 'not exists'));

  exports.navigator.mozMobileMessage = fakeMozMobileMessage;

  var navConnHelper = new NavConnectHelper(SMS_SERVICE);

  navConnHelper.then(function() {}, e => {
    debug('Got an exception while connecting. ' + e);
    window.navigator.mozMobileMessage.send = null;
    window.navigator.mozMobileMessage.sendMMS = null;
    window.navigator.mozMobileMessage.getThreads = null;
    window.navigator.mozMobileMessage.getMessage = null;
    window.navigator.mozMobileMessage.getMessages = null;
    window.navigator.mozMobileMessage.delete = null;
    window.navigator.mozMobileMessage.markMessageRead = null;
    window.navigator.mozMobileMessage.retrieveMMS = null;
    window.navigator.mozMobileMessage.getSegmentInfoForText = null;
    exports.navigator.mozMobileMessage = null;
  });

})(window);

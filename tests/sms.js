// mozSettings API tests (polyfilled!)
(function(window) {
  window.Tests = window.Tests || {};

  function onMessageReceived(log, e) {
    var message = e.message;

    if (message.messageClass && message.messageClass === 'class-0') {
      return;
    }

    // Here we can only have one sender, so deliveryInfo[0].deliveryStatus =>
    // message status from sender. Ignore 'pending' messages that are received
    // this means we are in automatic download mode
    if (message.delivery === 'not-downloaded' &&
        message.deliveryInfo[0].deliveryStatus === 'pending') {
      return;
    }

    log('message-received' + JSON.stringify(message));
  };

  function setHandlers(mozSMS, log) {
    mozSMS.addEventListener(
      'received', onMessageReceived.bind(undefined, log)
    );
  };

  window.Tests['sms'] = {
    dependencies : [
      '/WebAPI_pf/polyfills/common/webapi_poly_common.js',
      '/WebAPI_pf/polyfills/sms/sms.js'],

    runTest: function() {
      var log = window.Tests.log.bind(undefined, 'sms');
      var abort = window.Tests.abort;

      var _mozSMS = window.navigator.mozMobileMessage;

      function testSend(silent, cb) {
        !silent && log('***** TESTING send');
        var recipients = '682681246';
        var content = 'POLYFILL testing message';
        var options = {};

        var lock = _mozSMS.send(recipients, content, options);

        lock.then(success => {
          !silent && log('Successfuly sent msg' + JSON.stringify(success));
          cb && cb();
        }).catch(error => {
          log('Failured sending msg' + JSON.stringify(error));
        });
      }

      function testGetMessages(silent) {
        return new Promise((resolve, reject) => {
          var results = [];
          !silent && log('***** TESTING getMessages');
          var cursor = _mozSMS.getMessages({}, true);

          cursor.onsuccess = function onsuccess() {
            !silent &&
                log("testGetMessages.cursor.onsuccess: " + this.done + ", " +
                JSON.stringify(this.result));
            if (!this.done) {
              results.push(this.result);
              this.continue();
            } else {
              !silent && log("testGetMessages: All done!");
              resolve(results);
            }
          };
          cursor.onerror = function onerror() {
            var msg = 'getMessages. Error: ' + this.error.name;
            !silent && log(msg);
            reject();
          };
        });
      }

      function testGetMessage(aId) {
        log('***** TESTING getMessage');
        var id = aId || 1;

        _mozSMS.getMessage(id).then( message => {
          log('Successful getMessage ' + id + ":" +JSON.stringify(message));
        }, error => {
          log('Failed getMessage ' + id + ":" +JSON.stringify(error));
        });
      };

      function testDelete() {
        function execDelete() {
          log('***** TESTING delete');
          testGetMessages(true).then(smss => {
            log('We\'re goingt to delete this sms: ' + JSON.stringify(smss[0]));
            var id = smss[0].id;
            var req = _mozSMS.delete(id);
            req.onsuccess = function onsuccess() {
              log('Successful delete msg ' + id + 'result:' +
                  JSON.stringify(this.result));
              log('Trying to retrieve the same msg');
              testGetMessage(id);
            };

            req.onerror = function onerror() {
              var msg = 'Deleting in the database. Error: ' + req.error.name;
              log('Failed delete msg ' + id + ':' + msg);
            };
          });
        }
        testSend(true, execDelete);
      }

      function testGetThreads() {
        log('***** TESTING getThreads');
        var cursor;
        try {
          cursor = _mozSMS.getThreads();
        } catch (e) {
          log('Exception retrieving threads ' + JSON.stringify(e));
        }

        cursor.onsuccess = function onsuccess() {
          log("testGetThreads.cursor.onsuccess: " + this.done + ", " +
              JSON.stringify(this.result));
          if (!this.done) {
            this.continue();
          } else {
            log("testGetThreads: All done!");
          }
        };
        cursor.onerror = function onerror() {
          var msg = 'getThreads. Error: ' + this.error.name;
          log(msg);
        };
      }

      function testMarkMessageRead() {
        var id = 1;
        var isRead = true;
        var sendReadReport = true;

        var req  = _mozSMS.markMessageRead(id, isRead, sendReadReport);

        req.onsuccess = function() {
          log('Successfuly markMsgRead' + JSON.stringify(this.result));
        };
        req.onerror = function() {
          var text = 'Error while marking message ' + id +
                     ' as read:' + this.error.name;
          log('Failured markMsgRead. msg -->' + text);
        };
      }

      function testRetrieveMMS() {
        var id = 1;
        var req = _mozSMS.retrieveMMS(id);

        req.onsuccess = function() {
          log('Successful retrieveMMS [' + id + ']: ' +
              JSON.stringify(this.result));
        };

        req.onerror = function() {
          var text = 'Error retrieving mms [' + id +
                     '].' + this.error.name;
          log('Failured getMMS. msg -->' + text);
        };
      }

      function testGetSegmentInfoForText() {
        var txt = 'En un lugar de la Mancha, de cuyo nombre no quiero ';
        txt += 'acordarme, no ha mucho tiempo que vivía un hidalgo de los de ';
        txt += 'lanza en astillero, adarga antigua, rocín flaco y galgo ';
        txt += 'corredor. Una olla de algo más vaca que carnero, salpicón las ';
        txt += 'más noches, duelos y quebrantos los sábados, lantejas los ';
        txt += 'viernes, algún palomino de añadidura los domingos, consumían ';
        txt += 'las tres partes de su hacienda. El resto della concluían sayo ';
        txt += 'de velarte, calzas de velludo para las fiestas, con sus ';
        txt += 'pantuflos de lo mesmo, y los días de entresemana se honraba ';
        txt += 'con su vellorí de lo más fino. Tenía en su casa una ama que ';
        txt += 'pasaba de los cuarenta y una sobrina que no llegaba a los ';
        txt += 'veinte, y un mozo de campo y plaza que así ensillaba el rocín ';
        txt += 'como tomaba la podadera. Frisaba la edad de nuestro hidalgo ';
        txt += 'con los cincuenta años. Era de complexión recia, seco de ';
        txt += 'carnes, enjuto de rostro, gran madrugador y amigo de la caza. ';
        txt += 'Quieren decir que tenía el sobrenombre de «Quijada», o ';
        txt += '«Quesada», que en esto hay alguna diferencia en los autores ';
        txt += 'que deste caso escriben, aunque por conjeturas verisímiles se ';
        txt += 'deja entender que se llamaba «Quijana». Pero esto importa poco';
        txt += ' a nuestro cuento: basta que en la narración dél no se salga ';
        txt += 'un punto de la verdad.';

        var req = _mozSMS.getSegmentInfoForText(txt);

        req.onsuccess = function() {
          log('Successful getSegmentInfoForText [<Quijote first paragraph>]: ' +
              JSON.stringify(this.result));
        };

        req.onerror = function() {
          var text = 'Error retrieving mms [<Quijote first paragraph>].' +
                     this.error.name;
          log('Failured getMMS. msg -->' + text);
        };
      }

      try {
        log('Starting sms polyfill tests');
        window.navigator.mozMobileMessage ||
          abort('window.navigator.mozMobileMessage not defined.');

        setHandlers(_mozSMS, log);

        testSend();
        testGetMessages();
        testGetMessage();
        testDelete();
        testGetThreads();
        testMarkMessageRead();
        testRetrieveMMS();
        testGetSegmentInfoForText();
      } catch (e) {
        log("Finished early with " + e);
      }
    }
  };
})(window);

(function(window) {
  'use strict';
  //////////////////////////////////////////////////////////////////////////////
// This exists only so I don't have to keep remembering how to do it...
//////////////////////////////////////////////////////////////////////////////
  function addText(aElem, aText) {
    aElem.appendChild(document.createTextNode(aText));
  }

  function createElementAt(aMainBody, aType, aAttrs, aOptionalText, aBefore) {
    var elem = document.createElement(aType);

    // Add all the requested attributes
    if (aAttrs){
      for (var i in aAttrs){
        elem.setAttribute(i, aAttrs[i]);
      }
    }

    if (!aBefore) {
      aMainBody.appendChild(elem);
    } else {
      mainBody.insertBefore(elem, aBefore);
    }

    if (aOptionalText) {
      addText(elem, aOptionalText);
    }

    return elem;
  }

//////////////////////////////////////////////////////////////////////////////
// End of useful DOM manipulation...
//////////////////////////////////////////////////////////////////////////////

  window.DOMUtils = {
    addText: addText,
    createElementAt: createElementAt
  };

})(window);

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Thunderbird Conversations
 *
 * The Initial Developer of the Original Code is
 *  Jonathan Protzenko <jonathan.protzenko@gmail.com>
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

var EXPORTED_SYMBOLS = ['MonkeyPatch', 'BOOTSTRAP_REASONS']

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource:///modules/StringBundle.js"); // for StringBundle

Cu.import("resource://rethread/modules/stdlib/msgHdrUtils.js");
Cu.import("resource://rethread/modules/log.js");

Cu.import("resource://gre/modules/Services.jsm");

const BOOTSTRAP_REASONS = {
  APP_STARTUP     : 1,
  APP_SHUTDOWN    : 2,
  ADDON_ENABLE    : 3,
  ADDON_DISABLE   : 4,
  ADDON_INSTALL   : 5,
  ADDON_UNINSTALL : 6,
  ADDON_UPGRADE   : 7,
  ADDON_DOWNGRADE : 8
};

let strings = new StringBundle("chrome://rethread/locale/main.properties");

let Log = setupLogging("Rethread.MonkeyPatch");

let shouldPerformUninstall;

function MonkeyPatch(aWindow, aObj) {
  this._obj = aObj;
  this._window = aWindow;
}

MonkeyPatch.prototype = {

  undo: function _MonkeyPatch_undo(aReason) {
    let window = this._window;

    let myItem = window.document.getElementById("rethread-menuitem");
    if (myItem)
      myItem.parentNode.removeChild(myItem);
  },

  apply: function () {
    let self = this;
    let window = this._window;
    let mailContext = window.document.getElementById("mailContext");

    let shouldShow = function () {
      let shouldShow_ = function (aNode) {
        if (aNode)
          return (aNode.id == "threadTree" || shouldShow_(aNode.parentNode));
        else
          return false;
      };
      return shouldShow_(window.document.popupNode);
    };

    let oldFillMailContextMenu = window.fillMailContextMenu;
    window.fillMailContextMenu = function (event) {
      try {
        oldFillMailContextMenu.call(this, event);
      } catch (e) {
        Log.debug("Error calling oldFillMailContextMenu", e);
      }

      if (shouldShow()) {
        let item = window.document.getElementById("mailContext-ignoreThread");
        let myItem = window.document.createElement("menuitem");
        myItem.setAttribute("label", strings.get("rethread"));
        myItem.setAttribute("id", "rethread-menuitem");
        myItem.addEventListener("command", function () {
          this.rethread(window.gFolderDisplay.selectedMessages);
        }, false);
        item.parentNode.insertBefore(myItem, item);
      }
    };

    let oldMailContextOnPopupHiding = window.mailContextOnPopupHiding;
    window.mailContextOnPopupHiding = function (event) {
      try {
        oldMailContextOnPopupHiding.call(this, event);
      } catch (e) {
        Log.debug("Error calling oldMailContextOnPopupHiding", e);
      }

      self.undo();
    };

    Log.debug("Monkey patch successfully applied.");
  },

  rethread: function (aMsgHdrs) {
    Log.debug("Rethread");
  }
}

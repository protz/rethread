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

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");

let global = this;
let Log;

// from wjohnston (cleary for Fennec)
let ResourceRegister = {
  init: function(aFile, aName) {
    let resource = Services.io.getProtocolHandler("resource")
      .QueryInterface(Ci.nsIResProtocolHandler);
    let alias = Services.io.newFileURI(aFile);
    if (!aFile.isDirectory()) {
      alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
    }
    resource.setSubstitution(aName, alias);
  },

  uninit: function(aName) {
    let resource = Services.io.getProtocolHandler("resource")
      .QueryInterface(Ci.nsIResProtocolHandler);
    resource.setSubstitution(aName, null);
  }
};

function monkeyPatchWindow(window, aLater) {
  let doIt = function () {
    try {
      if (window.document.location != "chrome://messenger/content/messenger.xul")
        return;

      Log.debug("The window looks like a mail:3pane, monkey-patching...");

      window.Rethread = {
        rethread: null,
        monkeyPatch: null,
      };

      let monkeyPatch = new MonkeyPatch(window, window.Rethread);
      monkeyPatch.apply();

      Log.debug("Patched");
    } catch (e) {
      Log.error(e);
      dumpCallStack(e);
    }
  };

  if (aLater)
    window.addEventListener("load", function tmp () {
      window.removeEventListener("load", tmp, false);
      doIt();
    }, false);
  else
    doIt();
}

function startup(aData, aReason) {
  try {
    ResourceRegister.init(aData.installPath, "rethread");

    Cu.import("resource://rethread/modules/log.js", global);
    Cu.import("resource://rethread/modules/monkeypatch.js", global);

    Log = setupLogging("Rethread.Bootstrap");
  } catch (e) {
    dump("Early error !\n"+e+"\n");
  }

  try {
    // Patch all existing windows
    for each (let w in fixIterator(Services.wm.getEnumerator("mail:3pane")))
      monkeyPatchWindow(w, false);

    // Patch all future windows
    Services.ww.registerNotification({
      observe: function (aSubject, aTopic, aData) {
        if (aTopic == "domwindowopened") {
          aSubject.QueryInterface(Ci.nsIDOMWindow);
          monkeyPatchWindow(aSubject.window, true);
        }
      },
    });
  } catch (e) {
    Log.error(e);
    dumpCallStack(e);
  }
}

function shutdown(data, reason) {
  // No need to do extra work here
  if (reason == BOOTSTRAP_REASONS.APP_SHUTDOWN)
    return;

  ResourceRegister.uninit("rethread");
  for each (let w in fixIterator(Services.wm.getEnumerator("mail:3pane")))
    w.Rethread.monkeyPatch.undo(reason);
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

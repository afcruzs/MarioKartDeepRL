"use strict";
/*
 Copyright (C) 2012-2016 Grant Galitz

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function registerGUIEvents() {
    addEvent("keydown", document, keyDown);
    addEvent("keyup", document, keyUpPreprocess);
    addEvent("change", document.getElementById("rom_load"), fileLoadROM);
    addEvent("change", document.getElementById("bios_load"), fileLoadBIOS);
    addEvent("click", document.getElementById("play"), function (e) {
        IodineGUI.Iodine.play();
        this.className = "hide";
        document.getElementById("pause").className = "show";
        document.getElementById("menu").className = "playing";
    });
    addEvent("click", document.getElementById("pause"), function (e) {
        IodineGUI.Iodine.pause();
        this.className = "hide";
        document.getElementById("play").className = "show";
        document.getElementById("menu").className = "paused";
    });
    addEvent("click", document.getElementById("restart"), function (e) {
        IodineGUI.Iodine.restart();
    });
    addEvent("click", document.getElementById("sound"), function () {
        if (this.checked) {
            IodineGUI.Iodine.enableAudio();
        }
        else {
            IodineGUI.Iodine.disableAudio();
        }
    });
    addEvent("click", document.getElementById("skip_boot"), function () {
             IodineGUI.Iodine.toggleSkipBootROM(this.checked);
    });
    addEvent("click", document.getElementById("toggleSmoothScaling"), function () {
             if (IodineGUI.Blitter) {
                IodineGUI.Blitter.setSmoothScaling(this.checked);
             }
    });
    addEvent("click", document.getElementById("toggleDynamicSpeed"), function () {
             IodineGUI.Iodine.toggleDynamicSpeed(this.checked);
    });
    addEvent("click", document.getElementById("onthread-cpu"), function () {
             setValue("onthread-cpu", this.checked);
    });
    addEvent("click", document.getElementById("speedup"), function () {
             IodineGUI.Iodine.incrementSpeed(0.05);
    });
    addEvent("click", document.getElementById("speeddown"), function () {
             IodineGUI.Iodine.incrementSpeed(-0.05);
    });
    addEvent("click", document.getElementById("speedreset"), function () {
             IodineGUI.Iodine.setSpeed(1);
    });
    addEvent("click", document.getElementById("fullscreen"), toggleFullScreen);
    addEvent("change", document.getElementById("import"), function (e) {
             if (typeof this.files != "undefined") {
                try {
                    if (this.files.length >= 1) {
                        writeRedTemporaryText("Reading the local file \"" + this.files[0].name + "\" for importing.");
                        try {
                            //Gecko 1.9.2+ (Standard Method)
                            var binaryHandle = new FileReader();
                            binaryHandle.onload = function () {
                                if (this.readyState == 2) {
                                    writeRedTemporaryText("file imported.");
                                    try {
                                        import_save(this.result);
                                    }
                                    catch (error) {
                                        writeRedTemporaryText(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                                    }
                                }
                                else {
                                    writeRedTemporaryText("importing file, please wait...");
                                }
                            }
                            binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
                        }
                        catch (error) {
                            //Gecko 1.9.0, 1.9.1 (Non-Standard Method)
                            var romImageString = this.files[this.files.length - 1].getAsBinary();
                            try {
                                import_save(romImageString);
                            }
                            catch (error) {
                                writeRedTemporaryText(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                            }
                        }
                    }
                    else {
                        writeRedTemporaryText("Incorrect number of files selected for local loading.");
                    }
                }
                catch (error) {
                    writeRedTemporaryText("Could not load in a locally stored ROM file.");
                }
             }
             else {
                writeRedTemporaryText("could not find the handle on the file to open.");
             }
             if (e.preventDefault) {
                e.preventDefault();
             }
    });
    addEvent("click", document.getElementById("export"), refreshStorageListing);
    addEvent("unload", window, ExportSave);
    IodineGUI.Iodine.attachSpeedHandler(function (speed) {
        var speedDOM = document.getElementById("speed");
        speedDOM.textContent = "Speed: " + speed.toFixed(2) + "%";
    });
    addEvent("change", document.getElementById("volume"), volChangeFunc);
    addEvent("input", document.getElementById("volume"), volChangeFunc);
    addEvent("resize", window, resizeCanvasFunc);
    addEvent("mouseover", document.getElementById("saves_menu"), rebuildSavesMenu);
    //Run on init as well:
    resizeCanvasFunc();
}
function registerGUISettings() {
    document.getElementById("sound").checked = IodineGUI.defaults.sound;
    if (IodineGUI.defaults.sound) {
        IodineGUI.Iodine.enableAudio();
    }
    try {
        var volControl = document.getElementById("volume");
        volControl.min = 0;
        volControl.max = 100;
        volControl.step = 1;
        volControl.value = IodineGUI.defaults.volume * 100;
    }
    catch (e) {}
    IodineGUI.mixerInput.setVolume(IodineGUI.defaults.volume);
    document.getElementById("skip_boot").checked = IodineGUI.defaults.skipBoot;
    IodineGUI.Iodine.toggleSkipBootROM(IodineGUI.defaults.skipBoot);
    document.getElementById("toggleSmoothScaling").checked = IodineGUI.defaults.toggleSmoothScaling;
    IodineGUI.Blitter.setSmoothScaling(IodineGUI.defaults.toggleSmoothScaling);
    document.getElementById("toggleDynamicSpeed").checked = IodineGUI.defaults.toggleDynamicSpeed;
    IodineGUI.Iodine.toggleDynamicSpeed(IodineGUI.defaults.toggleDynamicSpeed);
    if (findValue("onthread-cpu") === null) {
        document.getElementById("onthread-cpu").checked = (navigator.userAgent.indexOf('AppleWebKit') != -1);
    }
    else {
        document.getElementById("onthread-cpu").checked = !!findValue("onthread-cpu");
    }
}
function resetPlayButton() {
    document.getElementById("pause").className = "hide";
    document.getElementById("play").className = "show";
}
function stepVolume(delta) {
    var volume = document.getElementById("volume").value / 100;
    volume = Math.min(Math.max(volume + delta, 0), 1);
    IodineGUI.mixerInput.setVolume(volume);
    document.getElementById("volume").value = Math.round(volume * 100);
}
function volChangeFunc() {
    IodineGUI.mixerInput.setVolume(Math.min(Math.max(parseInt(this.value), 0), 100) * 0.01);
};
function writeRedTemporaryText(textString) {
    if (IodineGUI.timerID) {
        clearTimeout(IodineGUI.timerID);
    }
    document.getElementById("tempMessage").style.display = "block";
    document.getElementById("tempMessage").textContent = textString;
    IodineGUI.timerID = setTimeout(clearTempString, 5000);
}
function clearTempString() {
    document.getElementById("tempMessage").style.display = "none";
}
function resizeCanvasFunc() {
    var container = document.getElementById("main");
    var containerHeight = container.clientHeight || container.offsetHeight || 0;
    var containerWidth = container.clientWidth || container.offsetWidth || 0;
    if (containerHeight > 0 && containerWidth > 0) {
        var canvas = document.getElementById("emulator_target");
        var maxWidth = Math.floor(containerHeight * 1.5);
        var maxHeight = Math.floor(containerWidth / 1.5);
        var height = Math.min(maxHeight, containerHeight);
        var width = Math.min(maxWidth, containerWidth);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
    }
}
function rebuildSavesMenu(e) {
    if (didNotEnter(document.getElementById("saves_menu_container"), e)) {
        ExportSave();
        rebuildExistingSaves();
        if (e.preventDefault) {
           e.preventDefault();
        }
    }
}
function rebuildExistingSaves() {
    var menu = document.getElementById("existing_saves_list");
    ExportSave();
    removeChildNodes(menu);
    var keys = getLocalStorageKeys();
    while (keys.length > 0) {
        addExistingSaveItem(menu, keys.shift());
    }
}
function addExistingSaveItem(menu, key) {
    var listItem = document.createElement("li");
    listItem.className = "nowrap";
    var spanItem = document.createElement("span");
    spanItem.textContent = decodeKeyType(key);
    listItem.appendChild(spanItem);
    var submenu = document.createElement("ul");
    var submenuItem = document.createElement("li");
    submenuItem.className = "nowrap";
    addEvent("click", submenuItem, function () {
        deleteValue(key);
        rebuildExistingSaves();
    });
    var submenuSpan = document.createElement("span");
    submenuSpan.textContent = "Delete";
    submenuItem.appendChild(submenuSpan);
    submenu.appendChild(submenuItem);
    var submenuItem2 = document.createElement("li");
    submenuItem2.className = "nowrap";
    var link1 = document.createElement("a");
    link1.href = "data:application/octet-stream;base64," + base64(generateBlob(key, findValue(key)));
    link1.download = key + "_" + ((new Date()).getTime()) + ".export";
    link1.textContent = "Download as import compatible";
    submenuItem2.appendChild(link1);
    submenu.appendChild(submenuItem2);
    var submenuItem3 = document.createElement("li");
    submenuItem3.className = "nowrap";
    var link2 = document.createElement("a");
    link2.href = "data:application/octet-stream;base64," + base64(findValue(key));
    link2.download = key + "_" + ((new Date()).getTime()) + ".sav";
    link2.textContent = "Download as raw binary";
    submenuItem3.appendChild(link2);
    submenu.appendChild(submenuItem3);
    listItem.appendChild(submenu);
    menu.appendChild(listItem);
}
function decodeKeyType(key) {
    if (key.substring(0, 10) == "TYPE_GUID_") {
        return "Game \"" + key.substring(10) + "\" Type Code";
    }
    else if (key.substring(0, 5) == "GUID_") {
        return "Game \"" + key.substring(5) + "\" Cartridge Data";
    }
    return key;
}
//Some wrappers and extensions for non-DOM3 browsers:
function removeChildNodes(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
function didNotEnter(oElement, event) {
    var target = (typeof event.target != "undefined") ? event.target : event.srcElement;
    while (target) {
        if (isSameNode(target, oElement)) {
            return false;
        }
        target = target.parentElement;
    }
	return true;
}
function isSameNode(oCheck1, oCheck2) {
	return (typeof oCheck1.isSameNode == "function") ? oCheck1.isSameNode(oCheck2) : (oCheck1 === oCheck2);
}
function addEvent(sEvent, oElement, fListener) {
    try {
        oElement.addEventListener(sEvent, fListener, false);
    }
    catch (error) {
        oElement.attachEvent("on" + sEvent, fListener);    //Pity for IE.
    }
}
function removeEvent(sEvent, oElement, fListener) {
    try {
        oElement.removeEventListener(sEvent, fListener, false);
    }
    catch (error) {
        oElement.detachEvent("on" + sEvent, fListener);    //Pity for IE.
    }
}

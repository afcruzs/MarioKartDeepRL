"use strict";
/*
 Copyright (C) 2012-2015 Grant Galitz
 
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function IodineGBAWorkerShim() {
    this.gfx = null;
    this.audio = null;
    this.audioInitialized = false;
    this.speed = null;
    this.saveExport = null;
    this.saveImport = null;
    this.worker = null;
    this.shared = null;
    this.initialize();
}
var tempvar = document.getElementsByTagName("script");
IodineGBAWorkerShim.prototype.filepath = tempvar[tempvar.length-1].src;
IodineGBAWorkerShim.prototype.initialize = function () {
    var parentObj = this;
    this.worker = new Worker(this.filepath.substring(0, (this.filepath.length | 0) - 3) + "Worker.js");
    this.worker.onmessage = function (event) {
        parentObj.decodeMessage(event.data);
    }
    if (window.SharedInt32Array) {
        this.shared = new SharedInt32Array(1);
        this.sendBufferBack(25, this.shared);
    }
}
IodineGBAWorkerShim.prototype.sendMessageSingle = function (eventCode) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode});
}
IodineGBAWorkerShim.prototype.sendMessageDouble = function (eventCode, eventData) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode, payload:eventData});
}
IodineGBAWorkerShim.prototype.sendBufferBack = function (eventCode, eventData) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode, payload:eventData}, [eventData.buffer]);
}
IodineGBAWorkerShim.prototype.play = function () {
    this.sendMessageSingle(0);
}
IodineGBAWorkerShim.prototype.pause = function () {
    this.sendMessageSingle(1);
}
IodineGBAWorkerShim.prototype.restart = function () {
    this.sendMessageSingle(2);
}
IodineGBAWorkerShim.prototype.setIntervalRate = function (rate) {
    rate = rate | 0;
    this.sendMessageDouble(3, rate | 0);
}
IodineGBAWorkerShim.prototype.timerCallback = function (timestamp) {
    timestamp = +timestamp;
    if (this.audio && this.audioInitialized) {
        if (this.shared) {
            this.shared[0] = this.audio.remainingBuffer() | 0;
        }
        else {
            this.sendMessageDouble(23, this.audio.remainingBuffer() | 0);
        }
    }
    this.sendMessageDouble(4, +timestamp);
}
IodineGBAWorkerShim.prototype.attachGraphicsFrameHandler = function (gfx) {
    this.gfx = gfx;
    this.sendMessageSingle(5);
}
IodineGBAWorkerShim.prototype.attachAudioHandler = function (audio) {
    this.audio = audio;
    this.sendMessageSingle(6);
}
IodineGBAWorkerShim.prototype.enableAudio = function () {
    if (this.audio) {
        this.sendMessageSingle(7);
    }
}
IodineGBAWorkerShim.prototype.disableAudio = function () {
    if (this.audio) {
        this.sendMessageSingle(8);
    }
}
IodineGBAWorkerShim.prototype.toggleSkipBootROM = function (doEnable) {
    doEnable = doEnable | 0;
    this.sendMessageDouble(9, doEnable | 0);
}
IodineGBAWorkerShim.prototype.toggleDynamicSpeed = function (doEnable) {
    doEnable = doEnable | 0;
    this.sendMessageDouble(10, doEnable | 0);
}
IodineGBAWorkerShim.prototype.attachSpeedHandler = function (speed) {
    this.speed = speed;
    this.sendMessageSingle(11);
}
IodineGBAWorkerShim.prototype.keyDown = function (keyCode) {
    keyCode = keyCode | 0;
    this.sendMessageDouble(12, keyCode | 0);
}
IodineGBAWorkerShim.prototype.keyUp = function (keyCode) {
    keyCode = keyCode | 0;
    this.sendMessageDouble(13, keyCode | 0);
}
IodineGBAWorkerShim.prototype.incrementSpeed = function (newSpeed) {
    newSpeed = +newSpeed;
    this.sendMessageDouble(14, +newSpeed);
}
IodineGBAWorkerShim.prototype.attachBIOS = function (BIOS) {
    this.sendMessageDouble(15, BIOS);
}
IodineGBAWorkerShim.prototype.attachROM = function (ROM) {
    this.sendMessageDouble(16, ROM);
}
IodineGBAWorkerShim.prototype.exportSave = function () {
    this.sendMessageSingle(17);
}
IodineGBAWorkerShim.prototype.attachSaveExportHandler = function (saveExport) {
    this.saveExport = saveExport;
    this.sendMessageSingle(18);
}
IodineGBAWorkerShim.prototype.attachSaveImportHandler = function (saveImport) {
    this.saveImport = saveImport;
    this.sendMessageSingle(19);
}
IodineGBAWorkerShim.prototype.decodeMessage = function (data) {
    switch (data.messageID) {
        case 0:
            this.audioInitialize(data.channels | 0, +data.sampleRate, data.bufferLimit | 0);
            break;
        case 1:
            this.audioRegister();
            break;
        case 2:
            this.audioSetBufferSpace(data.audioBufferContainAmount | 0);
            break;
        case 3:
            this.audioPush(data.audioBuffer, data.audioNumSamplesTotal | 0);
            break;
        case 4:
            this.graphicsPush(data.graphicsBuffer);
            break;
        case 5:
            this.speedPush(+data.speed);
            break;
        case 6:
            this.saveImportRequest(data.saveID);
            break;
        case 7:
            this.saveExportRequest(data.saveID, data.saveData);
            break;
        case 8:
            this.audioUnregister();
    }
}
IodineGBAWorkerShim.prototype.audioInitialize = function (channels, sampleRate, bufferLimit) {
    channels = channels | 0;
    sampleRate = +sampleRate;
    bufferLimit = bufferLimit | 0;
    if (this.audio) {
        this.audio.initialize(channels | 0, +sampleRate, bufferLimit | 0, function () {
            //Disable audio in the callback here:
            parentObj.disableAudio();
        });
        this.audioInitialized = true;
    }
}
IodineGBAWorkerShim.prototype.audioRegister = function () {
    if (this.audio) {
        this.audio.register();
    }
}
IodineGBAWorkerShim.prototype.audioUnregister = function () {
    if (this.audio) {
        this.audio.unregister();
    }
}
IodineGBAWorkerShim.prototype.audioSetBufferSpace = function (bufferSpace) {
    bufferSpace = bufferSpace | 0;
    if (this.audio) {
        this.audio.setBufferSpace(bufferSpace | 0);
    }
}
IodineGBAWorkerShim.prototype.audioPush = function (audioBuffer, audioNumSamplesTotal) {
    audioNumSamplesTotal = audioNumSamplesTotal | 0;
    if (this.audio) {
        this.audio.push(audioBuffer, audioNumSamplesTotal | 0);
        this.sendBufferBack(21, audioBuffer);
    }
}
IodineGBAWorkerShim.prototype.graphicsPush = function (graphicsBuffer) {
    if (this.gfx) {
        this.gfx(graphicsBuffer);
        this.sendBufferBack(22, graphicsBuffer);
    }
}
IodineGBAWorkerShim.prototype.speedPush = function (speed) {
    speed = +speed;
    if (this.speed) {
        this.speed(+speed);
    }
}
IodineGBAWorkerShim.prototype.saveImportRequest = function (saveID) {
    if (this.saveImport) {
        var parentObj = this;
        this.saveImport(saveID, function (saveData) {
            parentObj.sendMessageDouble(20, saveData);
        },
        function () {
            parentObj.sendMessageSingle(24);
        });
    }
}
IodineGBAWorkerShim.prototype.saveExportRequest = function (saveID, saveData) {
    if (this.saveExport) {
        this.saveExport(saveID, saveData);
    }
}
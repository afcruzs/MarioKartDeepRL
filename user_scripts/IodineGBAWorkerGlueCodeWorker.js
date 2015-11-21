"use strict";
/*
 Copyright (C) 2012-2015 Grant Galitz
 
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
importScripts("../IodineGBA/includes/TypedArrayShim.js");
importScripts("../IodineGBA/core/Cartridge.js");
importScripts("../IodineGBA/core/DMA.js");
importScripts("../IodineGBA/core/Emulator.js");
importScripts("../IodineGBA/core/Graphics.js");
importScripts("../IodineGBA/core/RunLoop.js");
importScripts("../IodineGBA/core/Memory.js");
importScripts("../IodineGBA/core/IRQ.js");
importScripts("../IodineGBA/core/JoyPad.js");
importScripts("../IodineGBA/core/Serial.js");
importScripts("../IodineGBA/core/Sound.js");
importScripts("../IodineGBA/core/Timer.js");
importScripts("../IodineGBA/core/Wait.js");
importScripts("../IodineGBA/core/CPU.js");
importScripts("../IodineGBA/core/Saves.js");
importScripts("../IodineGBA/core/sound/FIFO.js");
importScripts("../IodineGBA/core/sound/Channel1.js");
importScripts("../IodineGBA/core/sound/Channel2.js");
importScripts("../IodineGBA/core/sound/Channel3.js");
importScripts("../IodineGBA/core/sound/Channel4.js");
importScripts("../IodineGBA/core/CPU/ARM.js");
importScripts("../IodineGBA/core/CPU/THUMB.js");
importScripts("../IodineGBA/core/CPU/CPSR.js");
importScripts("../IodineGBA/core/graphics/Renderer.js");
importScripts("../IodineGBA/core/graphics/RendererProxy.js");
importScripts("../IodineGBA/core/graphics/BGTEXT.js");
importScripts("../IodineGBA/core/graphics/BG2FrameBuffer.js");
importScripts("../IodineGBA/core/graphics/BGMatrix.js");
importScripts("../IodineGBA/core/graphics/AffineBG.js");
importScripts("../IodineGBA/core/graphics/ColorEffects.js");
importScripts("../IodineGBA/core/graphics/Mosaic.js");
importScripts("../IodineGBA/core/graphics/OBJ.js");
importScripts("../IodineGBA/core/graphics/OBJWindow.js");
importScripts("../IodineGBA/core/graphics/Window.js");
importScripts("../IodineGBA/core/graphics/Compositor.js");
importScripts("../IodineGBA/core/memory/DMA0.js");
importScripts("../IodineGBA/core/memory/DMA1.js");
importScripts("../IodineGBA/core/memory/DMA2.js");
importScripts("../IodineGBA/core/memory/DMA3.js");
importScripts("../IodineGBA/core/cartridge/SaveDeterminer.js");
importScripts("../IodineGBA/core/cartridge/SRAM.js");
importScripts("../IodineGBA/core/cartridge/FLASH.js");
importScripts("../IodineGBA/core/cartridge/EEPROM.js");
var Iodine = new GameBoyAdvanceEmulator();
//Save callbacks waiting to be satisfied:
var saveImportPool = [];
//Graphics Buffer:
var gfxBuffer = new SharedUint8Array(160 * 240 * 3);
var gfxLock = new SharedInt8Array(1);
//Audio Buffers:
var audioBuffer = new SharedFloat32Array(0x10000);
var audioLock = new SharedInt8Array(1);
var audioMetrics = new SharedInt32Array(2);
//Time Stamp tracking:
var timestamp = new SharedFloat64Array(1);
//Pass the shared array buffers:
postMessage({messageID:0, graphicsBuffer:gfxBuffer, gfxLock:gfxLock, audioBuffer:audioBuffer, audioLock:audioLock, audioMetrics:audioMetrics, timestamp:timestamp}, [gfxBuffer.buffer, gfxLock.buffer, audioBuffer.buffer, audioLock.buffer, audioMetrics.buffer, timestamp.buffer]);
//Event decoding:
self.onmessage = function (event) {
    var data = event.data;
    switch (data.messageID | 0) {
        case 0:
            Iodine.play();
            break;
        case 1:
            Iodine.pause();
            break;
        case 2:
            Iodine.restart();
            break;
        case 3:
            Iodine.setIntervalRate(data.payload | 0);
            setInterval(function() {Iodine.timerCallback(+timestamp[0]);}, data.payload | 0);
            break;
        case 4:
            Iodine.attachGraphicsFrameHandler(graphicsFrameHandler);
            break;
        case 5:
            Iodine.attachAudioHandler(audioHandler);
            break;
        case 6:
            Iodine.enableAudio();
            break;
        case 7:
            Iodine.disableAudio();
            break;
        case 8:
            Iodine.toggleSkipBootROM(!!data.payload);
            break;
        case 9:
            Iodine.toggleDynamicSpeed(!!data.payload);
            break;
        case 10:
            Iodine.attachSpeedHandler(speedHandler);
            break;
        case 11:
            Iodine.keyDown(data.payload | 0);
            break;
        case 12:
            Iodine.keyUp(data.payload | 0);
            break;
        case 13:
            Iodine.incrementSpeed(+data.payload);
            break;
        case 14:
            Iodine.attachBIOS(data.payload);
            break;
        case 15:
            Iodine.attachROM(data.payload);
            break;
        case 16:
            Iodine.exportSave();
            break;
        case 17:
            Iodine.attachSaveExportHandler(saveExportHandler);
            break;
        case 18:
            Iodine.attachSaveImportHandler(saveImportHandler);
            break;
        case 19:
            processSaveImportSuccess(data.payload);
            break;
        case 20:
            processSaveImportFail();
    }
}
function graphicsFrameHandler(swizzledFrame) {
    waitForAccess(gfxLock);
    gfxBuffer.set(swizzledFrame);
    Atomics.store(gfxLock, 0, 2);
}
//Shim for our audio api:
var audioHandler = {
    initialize:function (channels, sampleRate, bufferLimit) {
        channels = channels | 0;
        sampleRate = sampleRate | 0;
        bufferLimit = bufferLimit | 0;
        postMessage({messageID:1, channels:channels | 0, sampleRate:sampleRate | 0, bufferLimit:bufferLimit | 0});
    },
    push:function (buffer, amountToSend) {
        //Obtain lock on buffer:
        waitForAccess(audioLock);
        //Push audio into buffer:
        var offset = Atomics.load(audioMetrics, 1) | 0;
        var endPosition = Math.min(((amountToSend | 0) + (offset | 0)) | 0, 0x10000) | 0;
        for (var position = 0; (offset | 0) < (endPosition | 0); position = ((position | 0) + 1) | 0) {
            audioBuffer[offset | 0] = buffer[position | 0];
            offset = ((offset | 0) + 1) | 0;
        }
        Atomics.store(audioMetrics, 1, offset | 0);
        //Release lock:
        Atomics.store(audioLock, 0, 2);
    },
    register:function () {
        postMessage({messageID:2});
    },
    unregister:function () {
        postMessage({messageID:3});
    },
    setBufferSpace:function (spaceContain) {
        postMessage({messageID:4, audioBufferContainAmount:spaceContain | 0});
    },
    remainingBuffer:function () {
        var amount = Atomics.load(audioMetrics, 0) | 0;
        amount = ((amount | 0) + (Atomics.load(audioMetrics, 0) | 0)) | 0;
        return amount | 0;
    }
};
function saveImportHandler(saveID, saveCallback, noSaveCallback) {
    postMessage({messageID:5, saveID:saveID});
    saveImportPool.push([saveCallback, noSaveCallback]);
}
function saveExportHandler(saveID, saveData) {
    postMessage({messageID:6, saveID:saveID, saveData:saveData});
}
function speedHandler(speed) {
    postMessage({messageID:7, speed:speed});
}
function processSaveImportSuccess(saveData) {
    saveImportPool.shift()[0](saveData);
}
function processSaveImportFail() {
    saveImportPool.shift()[1]();
}
function waitForAccess(buffer) {
    while (Atomics.compareExchange(buffer, 0, 0, 1) == 1);
    while (Atomics.compareExchange(buffer, 0, 2, 1) != 1);
}
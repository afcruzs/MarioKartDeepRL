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
//Spare audio buffers:
var audioBufferPool = [];
//Spare graphics buffers:
var graphicsBufferPool = [];
//Save callbacks waiting to be satisfied:
var saveImportPool = [];
//Cached timestamp:
var timestamp = 0;
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
            setInterval(function() {Iodine.timerCallback(+timestamp);}, data.payload | 0);
            break;
        case 4:
            timestamp = +data.payload;
            break;
        case 5:
            Iodine.attachGraphicsFrameHandler(graphicsFrameHandler);
            break;
        case 6:
            Iodine.attachAudioHandler(audioHandler);
            break;
        case 7:
            Iodine.enableAudio();
            break;
        case 8:
            Iodine.disableAudio();
            break;
        case 9:
            Iodine.toggleSkipBootROM(!!data.payload);
            break;
        case 10:
            Iodine.toggleDynamicSpeed(!!data.payload);
            break;
        case 11:
            Iodine.attachSpeedHandler(speedHandler);
            break;
        case 12:
            Iodine.keyDown(data.payload | 0);
            break;
        case 13:
            Iodine.keyUp(data.payload | 0);
            break;
        case 14:
            Iodine.incrementSpeed(+data.payload);
            break;
        case 15:
            Iodine.attachBIOS(data.payload);
            break;
        case 16:
            Iodine.attachROM(data.payload);
            break;
        case 17:
            Iodine.exportSave();
            break;
        case 18:
            Iodine.attachSaveExportHandler(saveExportHandler);
            break;
        case 19:
            Iodine.attachSaveImportHandler(saveImportHandler);
            break;
        case 20:
            processSaveImportSuccess(data.payload);
            break;
        case 21:
            repoolAudioBuffer(data.payload);
            break;
        case 22:
            repoolGraphicsBuffer(data.payload);
            break;
        case 23:
            audioHandler.remainingBufferCache = data.payload;
            break;
        case 24:
            processSaveImportFail();
    }
}
function graphicsFrameHandler(swizzledFrame) {
    var buffer = getFreeGraphicsBuffer(swizzledFrame.length);
    buffer.set(swizzledFrame);
    postMessage({messageID:4, graphicsBuffer:buffer}, [buffer.buffer]);
}
//Shim for our audio api:
var audioHandler = {
    push:function (audioBuffer, amountToSend) {
        var buffer = getFreeAudioBuffer(amountToSend | 0);
        buffer.set(audioBuffer);
        postMessage({messageID:3, audioBuffer:buffer, audioNumSamplesTotal:amountToSend | 0}, [buffer.buffer]);
    },
    register:function () {
        postMessage({messageID:1});
    },
    unregister:function () {
        postMessage({messageID:8});
    },
    setBufferSpace:function (spaceContain) {
        postMessage({messageID:2, audioBufferContainAmount:spaceContain});
    },
    initialize:function (channels, sampleRate, bufferLimit) {
        postMessage({messageID:0, channels:channels, sampleRate:sampleRate, bufferLimit:bufferLimit});
    },
    remainingBuffer:function () {
        return this.remainingBufferCache;
    },
    remainingBufferCache:0
};
function speedHandler(speed) {
     postMessage({messageID:5, speed:speed});
}
function saveExportHandler(saveID, saveData) {
    postMessage({messageID:7, saveID:saveID, saveData:saveData});
}
function saveImportHandler(saveID, saveCallback, noSaveCallback) {
    postMessage({messageID:6, saveID:saveID});
    saveImportPool.push([saveCallback, noSaveCallback]);
}
function processSaveImportSuccess(saveData) {
    saveImportPool.shift()[0](saveData);
}
function processSaveImportFail() {
    saveImportPool.shift()[1]();
}
function repoolAudioBuffer(buffer) {
    audioBufferPool.push(buffer);
}
function repoolGraphicsBuffer(buffer) {
    graphicsBufferPool.push(buffer);
}
function getFreeGraphicsBuffer(amountToSend) {
    if (graphicsBufferPool.length == 0) {
        return new getUint8Array(amountToSend);
    }
    return graphicsBufferPool.shift();
}
function getFreeAudioBuffer(amountToSend) {
    while (audioBufferPool.length > 0) {
        var buffer = audioBufferPool.shift();
        if (buffer.length >= amountToSend) {
            return buffer;
        }
    }
    return new getFloat32Array(amountToSend);
}
"use strict";
/*
 Copyright (C) 2012-2016 Grant Galitz

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
importScripts("../IodineGBA/includes/TypedArrayShim.js");
importScripts("../IodineGBA/core/graphics/Renderer.js");
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
var renderer = null;
var gfxBuffers = null;
var gfxCounters = null;
var gfxCommandBuffer = null;
var gfxCommandCounters = null;
self.onmessage = function (event) {
    var data = event.data;
    switch (data.messageID) {
        case 0:
            processCommands();
            break;
        case 1:
            assignBuffers(data.gfxBuffers, data.gfxCounters, data.gfxCommandBuffer, data.gfxCommandCounters);
            break;
        default:
            initializeRenderer(!!data.skippingBIOS);
    }
}
var coreExposed = {
    graphicsHandle:{
        copyBuffer:function (swizzledFrame) {
            //Push a frame of graphics to the blitter handle:
            //Load the counter values:
            var start = gfxCounters[0] | 0;                     //Written by the other thread.
            var end = gfxCounters[1] | 0;                       //Written by this thread.
            //Check if buffer is full:
            if ((end | 0) == (((start | 0) + 2) | 0)) {
                //Skip copying a frame out:
                return;
            }
            //Copy samples into the ring buffer:
            //Hardcoded for 2 buffers for a triple buffer effect:
            gfxBuffers[end & 0x1].set(swizzledFrame);
            //Increment the ending position counter by 1:
            //Atomic to commit the counter to memory:
            Atomics.store(gfxCounters, 1, ((end | 0) + 1) | 0);
        }
    }
}
function initializeRenderer(skippingBIOS) {
    skippingBIOS = !!skippingBIOS;
    renderer = new GameBoyAdvanceGraphicsRenderer(coreExposed, !!skippingBIOS);
}
function assignBuffers(gfxBuffers, gfxCounters, gfxCommandBuffer, gfxCommandCounters) {
    gfxBuffers = gfxBuffers;
    gfxCounters = gfxCounters;
    gfxCommandBuffer = gfxCommandBuffer;
    gfxCommandCounters = gfxCommandCounters;
}
function processCommands() {
    //Load the counter values:
    var start = gfxCommandCounters[0] | 0;              //Written by this thread.
    var end = Atomics.load(gfxCommandCounters, 1) | 0;  //Written by the other thread.
    //Don't process if nothing to process:
    if ((end | 0) == (start | 0)) {
        //Buffer is empty:
        return;
    }
    //Dispatch commands:
    var startCorrected = start & 0x7FFFF;
    var endCorrected = end & 0x7FFFF;
    do {
        dispatchCommand(gfxCommandBuffer[startCorrected | 0] | 0, gfxCommandBuffer[startCorrected | 1] | 0);
        startCorrected = ((startCorrected | 0) + 2) | 0;
    } while ((startCorrected | 0) != (endCorrected | 0));
    //Update the starting position counter to match the end position:
    Atomics.store(gfxCommandCounters, 0, end | 0);
}
function dispatchCommand(command, data) {
    command = command | 0;
    data = data | 0;
    switch (command >> 17) {
        //IO:
        case 0:
            dispatchIOCommand(command | 0, data | 0);
            break;
        //VRAM 16-BIT:
        case 1:
            renderer.writeVRAM16(command & 0xFFFF, data | 0);
            break;
        //VRAM 32-BIT:
        case 2:
            renderer.writeVRAM32(command & 0x7FFF, data | 0);
            break;
        //Palette 16-BIT:
        case 3:
            renderer.writePalette16(command & 0x1FF, data | 0);
            break;
        //Palette 32-BIT:
        case 4:
            renderer.writePalette32(command & 0xFF, data | 0);
            break;
        //OAM 16-BIT:
        case 5:
            renderer.writeOAM16(command & 0x1FF, data | 0);
            break;
        //OAM 32-BIT:
        default:
            renderer.writeOAM32(command & 0xFF, data | 0);
    }
}
function dispatchIOCommand(command, data) {
    command = command | 0;
    data = data | 0;
    switch (command | 0) {

    }
}

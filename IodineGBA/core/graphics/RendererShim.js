"use strict";
/*
 Copyright (C) 2012-2016 Grant Galitz

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 function getGameBoyAdvanceGraphicsRenderer(coreExposed, skippingBIOS) {
     if (!window.SharedArrayBuffer || !Atomics) {
         return new GameBoyAdvanceGraphicsRenderer(coreExposed, skippingBIOS);
     }
     else {
         return new GameBoyAdvanceGraphicsRendererShim(coreExposed, skippingBIOS);
     }
 }
 function GameBoyAdvanceGraphicsRendererShim(coreExposed, skippingBIOS) {
     this.coreExposed = coreExposed;
     this.initializeWorker();
     this.initializeBuffers();
     this.shareBuffers(skippingBIOS);
 }
 var tempvar = document.getElementsByTagName("script");
 GameBoyAdvanceGraphicsRendererShim.prototype.filepath = tempvar[tempvar.length-1].src;
 GameBoyAdvanceGraphicsRendererShim.prototype.initializeWorker = function () {
     this.worker = new Worker(this.filepath.substring(0, (this.filepath.length | 0) - 3) + "Worker.js");
 }
 GameBoyAdvanceGraphicsRendererShim.prototype.initializeBuffers = function () {
     //Graphics Buffers:
     this.gfxCommandBuffer = getSharedInt32Array(0x80000);
     this.gfxCommandCounters = getSharedInt32Array(2);
 }
 GameBoyAdvanceGraphicsRendererShim.prototype.shareBuffers = function (skippingBIOS) {
     skippingBIOS = !!skippingBIOS;
     this.worker.postMessage({
         skippingBIOS:!!skippingBIOS,
         gfxBuffers:gfxBuffers,
         gfxCounters:gfxCounters,
         gfxCommandBuffer:this.gfxCommandBuffer,
         gfxCommandCounters:this.gfxCommandCounters
     }, [
         gfxBuffers[0].buffer,
         gfxBuffers[1].buffer,
         gfxCounters.buffer,
         this.gfxCommandBuffer.buffer,
         this.gfxCommandCounters.buffer
     ]);
 }
GameBoyAdvanceGraphicsRendererShim.prototype.pushCommand = function (command, data) {
    command = command | 0;
    data = data | 0;
    //Load the write counter value:
    var end = this.gfxCommandCounters[1] | 0;
    //Block while full:
    Atomics.futexWait(this.gfxCommandCounters, 0, ((end | 0) - 0x80000) | 0);
    //Get the write offset into the ring buffer:
    var endCorrected = end & 0x7FFFF;
    //Push command into buffer:
    this.gfxCommandBuffer[endCorrected | 0] = command | 0;
    //Push data into buffer:
    this.gfxCommandBuffer[endCorrected | 1] = data | 0;
    //Update the cross thread buffering count:
    end = ((end | 0) + 2) | 0;
    //Atomic store to commit writes to memory:
    Atomics.store(this.gfxCommandCounters, 1, end | 0);
}
GameBoyAdvanceGraphicsRendererShim.prototype.incrementScanLineQueue = function () {
    //Increment scan line command:
    this.pushCommand(0, 0);
}

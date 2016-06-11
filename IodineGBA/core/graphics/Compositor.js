"use strict";
/*
 Copyright (C) 2012-2016 Grant Galitz

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function GameBoyAdvanceCompositor(gfx) {
    this.gfx = gfx;
    this.doEffects = 0;
}
function GameBoyAdvanceWindowCompositor(gfx) {
    this.gfx = gfx;
    this.doEffects = 0;
}
function GameBoyAdvanceOBJWindowCompositor(gfx) {
    this.gfx = gfx;
    this.doEffects = 0;
}
GameBoyAdvanceCompositor.prototype.initialize = GameBoyAdvanceWindowCompositor.prototype.initialize = function () {
    this.buffer = this.gfx.buffer;
    this.colorEffectsRenderer = this.gfx.colorEffectsRenderer;
}
GameBoyAdvanceOBJWindowCompositor.prototype.initialize = function () {
    this.buffer = this.gfx.buffer;
    this.colorEffectsRenderer = this.gfx.colorEffectsRenderer;
    this.OBJWindowBuffer = this.gfx.objRenderer.scratchWindowBuffer;
}
GameBoyAdvanceCompositor.prototype.preprocess = GameBoyAdvanceWindowCompositor.prototype.preprocess = GameBoyAdvanceOBJWindowCompositor.prototype.preprocess = function (doEffects) {
    doEffects = doEffects | 0;
    this.doEffects = doEffects | 0;
}
GameBoyAdvanceOBJWindowCompositor.prototype.renderScanLine = GameBoyAdvanceCompositor.prototype.renderScanLine = function (layers) {
    layers = layers | 0;
    if ((this.doEffects | 0) == 0) {
        this.renderNormalScanLine(layers | 0);
    }
    else {
        this.renderScanLineWithEffects(layers | 0);
    }
}
GameBoyAdvanceWindowCompositor.prototype.renderScanLine = function (xStart, xEnd, layers) {
    xStart = xStart | 0;
    xEnd = xEnd | 0;
    layers = layers | 0;
    if ((this.doEffects | 0) == 0) {
        this.renderNormalScanLine(xStart | 0, xEnd | 0, layers | 0);
    }
    else {
        this.renderScanLineWithEffects(xStart | 0, xEnd | 0, layers | 0);
    }
}
GameBoyAdvanceOBJWindowCompositor.prototype.renderNormalScanLine = GameBoyAdvanceCompositor.prototype.renderNormalScanLine = function (layers) {
    layers = layers | 0;
    switch (layers | 0) {
        case 0:
            this.normal0();
            break;
        case 1:
            this.normal1();
            break;
        case 2:
            this.normal2();
            break;
        case 3:
            this.normal3();
            break;
        case 4:
            this.normal4();
            break;
        case 5:
            this.normal5();
            break;
        case 6:
            this.normal6();
            break;
        case 7:
            this.normal7();
            break;
        case 8:
            this.normal8();
            break;
        case 9:
            this.normal9();
            break;
        case 10:
            this.normal10();
            break;
        case 11:
            this.normal11();
            break;
        case 12:
            this.normal12();
            break;
        case 13:
            this.normal13();
            break;
        case 14:
            this.normal14();
            break;
        case 15:
            this.normal15();
            break;
        case 16:
            this.normal16();
            break;
        case 17:
            this.normal17();
            break;
        case 18:
            this.normal18();
            break;
        case 19:
            this.normal19();
            break;
        case 20:
            this.normal20();
            break;
        case 21:
            this.normal21();
            break;
        case 22:
            this.normal22();
            break;
        case 23:
            this.normal23();
            break;
        case 24:
            this.normal24();
            break;
        case 25:
            this.normal25();
            break;
        case 26:
            this.normal26();
            break;
        case 27:
            this.normal27();
            break;
        case 28:
            this.normal28();
            break;
        case 29:
            this.normal29();
            break;
        case 30:
            this.normal30();
            break;
        default:
            this.normal31();
    }
}
GameBoyAdvanceWindowCompositor.prototype.renderNormalScanLine = function (xStart, xEnd, layers) {
    xStart = xStart | 0;
    xEnd = xEnd | 0;
    layers = layers | 0;
    switch (layers | 0) {
        case 0:
            this.normal0(xStart | 0, xEnd | 0);
            break;
        case 1:
            this.normal1(xStart | 0, xEnd | 0);
            break;
        case 2:
            this.normal2(xStart | 0, xEnd | 0);
            break;
        case 3:
            this.normal3(xStart | 0, xEnd | 0);
            break;
        case 4:
            this.normal4(xStart | 0, xEnd | 0);
            break;
        case 5:
            this.normal5(xStart | 0, xEnd | 0);
            break;
        case 6:
            this.normal6(xStart | 0, xEnd | 0);
            break;
        case 7:
            this.normal7(xStart | 0, xEnd | 0);
            break;
        case 8:
            this.normal8(xStart | 0, xEnd | 0);
            break;
        case 9:
            this.normal9(xStart | 0, xEnd | 0);
            break;
        case 10:
            this.normal10(xStart | 0, xEnd | 0);
            break;
        case 11:
            this.normal11(xStart | 0, xEnd | 0);
            break;
        case 12:
            this.normal12(xStart | 0, xEnd | 0);
            break;
        case 13:
            this.normal13(xStart | 0, xEnd | 0);
            break;
        case 14:
            this.normal14(xStart | 0, xEnd | 0);
            break;
        case 15:
            this.normal15(xStart | 0, xEnd | 0);
            break;
        case 16:
            this.normal16(xStart | 0, xEnd | 0);
            break;
        case 17:
            this.normal17(xStart | 0, xEnd | 0);
            break;
        case 18:
            this.normal18(xStart | 0, xEnd | 0);
            break;
        case 19:
            this.normal19(xStart | 0, xEnd | 0);
            break;
        case 20:
            this.normal20(xStart | 0, xEnd | 0);
            break;
        case 21:
            this.normal21(xStart | 0, xEnd | 0);
            break;
        case 22:
            this.normal22(xStart | 0, xEnd | 0);
            break;
        case 23:
            this.normal23(xStart | 0, xEnd | 0);
            break;
        case 24:
            this.normal24(xStart | 0, xEnd | 0);
            break;
        case 25:
            this.normal25(xStart | 0, xEnd | 0);
            break;
        case 26:
            this.normal26(xStart | 0, xEnd | 0);
            break;
        case 27:
            this.normal27(xStart | 0, xEnd | 0);
            break;
        case 28:
            this.normal28(xStart | 0, xEnd | 0);
            break;
        case 29:
            this.normal29(xStart | 0, xEnd | 0);
            break;
        case 30:
            this.normal30(xStart | 0, xEnd | 0);
            break;
        default:
            this.normal31(xStart | 0, xEnd | 0);
    }
}
GameBoyAdvanceOBJWindowCompositor.prototype.renderScanLineWithEffects = GameBoyAdvanceCompositor.prototype.renderScanLineWithEffects = function (layers) {
    layers = layers | 0;
    switch (layers | 0) {
        case 0:
            this.special0();
            break;
        case 1:
            this.special1();
            break;
        case 2:
            this.special2();
            break;
        case 3:
            this.special3();
            break;
        case 4:
            this.special4();
            break;
        case 5:
            this.special5();
            break;
        case 6:
            this.special6();
            break;
        case 7:
            this.special7();
            break;
        case 8:
            this.special8();
            break;
        case 9:
            this.special9();
            break;
        case 10:
            this.special10();
            break;
        case 11:
            this.special11();
            break;
        case 12:
            this.special12();
            break;
        case 13:
            this.special13();
            break;
        case 14:
            this.special14();
            break;
        case 15:
            this.special15();
            break;
        case 16:
            this.special16();
            break;
        case 17:
            this.special17();
            break;
        case 18:
            this.special18();
            break;
        case 19:
            this.special19();
            break;
        case 20:
            this.special20();
            break;
        case 21:
            this.special21();
            break;
        case 22:
            this.special22();
            break;
        case 23:
            this.special23();
            break;
        case 24:
            this.special24();
            break;
        case 25:
            this.special25();
            break;
        case 26:
            this.special26();
            break;
        case 27:
            this.special27();
            break;
        case 28:
            this.special28();
            break;
        case 29:
            this.special29();
            break;
        case 30:
            this.special30();
            break;
        default:
            this.special31();
    }
}
GameBoyAdvanceWindowCompositor.prototype.renderScanLineWithEffects = function (xStart, xEnd, layers) {
    xStart = xStart | 0;
    xEnd = xEnd | 0;
    layers = layers | 0;
    switch (layers | 0) {
        case 0:
            this.special0(xStart | 0, xEnd | 0);
            break;
        case 1:
            this.special1(xStart | 0, xEnd | 0);
            break;
        case 2:
            this.special2(xStart | 0, xEnd | 0);
            break;
        case 3:
            this.special3(xStart | 0, xEnd | 0);
            break;
        case 4:
            this.special4(xStart | 0, xEnd | 0);
            break;
        case 5:
            this.special5(xStart | 0, xEnd | 0);
            break;
        case 6:
            this.special6(xStart | 0, xEnd | 0);
            break;
        case 7:
            this.special7(xStart | 0, xEnd | 0);
            break;
        case 8:
            this.special8(xStart | 0, xEnd | 0);
            break;
        case 9:
            this.special9(xStart | 0, xEnd | 0);
            break;
        case 10:
            this.special10(xStart | 0, xEnd | 0);
            break;
        case 11:
            this.special11(xStart | 0, xEnd | 0);
            break;
        case 12:
            this.special12(xStart | 0, xEnd | 0);
            break;
        case 13:
            this.special13(xStart | 0, xEnd | 0);
            break;
        case 14:
            this.special14(xStart | 0, xEnd | 0);
            break;
        case 15:
            this.special15(xStart | 0, xEnd | 0);
            break;
        case 16:
            this.special16(xStart | 0, xEnd | 0);
            break;
        case 17:
            this.special17(xStart | 0, xEnd | 0);
            break;
        case 18:
            this.special18(xStart | 0, xEnd | 0);
            break;
        case 19:
            this.special19(xStart | 0, xEnd | 0);
            break;
        case 20:
            this.special20(xStart | 0, xEnd | 0);
            break;
        case 21:
            this.special21(xStart | 0, xEnd | 0);
            break;
        case 22:
            this.special22(xStart | 0, xEnd | 0);
            break;
        case 23:
            this.special23(xStart | 0, xEnd | 0);
            break;
        case 24:
            this.special24(xStart | 0, xEnd | 0);
            break;
        case 25:
            this.special25(xStart | 0, xEnd | 0);
            break;
        case 26:
            this.special26(xStart | 0, xEnd | 0);
            break;
        case 27:
            this.special27(xStart | 0, xEnd | 0);
            break;
        case 28:
            this.special28(xStart | 0, xEnd | 0);
            break;
        case 29:
            this.special29(xStart | 0, xEnd | 0);
            break;
        case 30:
            this.special30(xStart | 0, xEnd | 0);
            break;
        default:
            this.special31(xStart | 0, xEnd | 0);
    }
}
function generateIodineGBAGFXCompositors() {
    function generateLoop(compositeType, doEffects, layers) {
        function generateLocalScopeInit(layers) {
            //Declare the necessary temporary variables:
            var code = "";
            switch (layers) {
                case 0:
                    //Don't need any if no layers to process:
                    break;
                default:
                    //Need this temp for more than one layer:
                    code +=
                    "var workingPixel = 0;";
                case 0x1:
                case 0x2:
                case 0x4:
                case 0x8:
                case 0x10:
                    //Need these temps for one or more layers:
                    code +=
                    "var currentPixel = 0;" +
                    "var lowerPixel = 0;";
            }
            return code;
        }
        function generateLoopBody(doEffects, layers) {
            function getSingleLayerPrefix() {
                //Pass initialization if processing only 1 layer:
                return "lowerPixel = this.gfx.backdrop | 0;";
            }
            function getMultiLayerPrefix() {
                //Pass initialization if processing more than 1 layer:
                return "lowerPixel = this.gfx.backdrop | 0; currentPixel = lowerPixel | 0;";
            }
            function generateLayerCompareSingle(layerOffset) {
                //Only 1 layer specified to be rendered:
                var code =
                "currentPixel = this.buffer[xStart | " + layerOffset + "] | 0;" +
                "if ((currentPixel & 0x2000000) != 0) {" +
                    "currentPixel = lowerPixel | 0;" +
                "}";
                return code;
            }
            function generateLayerCompare(layerOffset) {
                //Code unit to be used when rendering more than 1 layer:
                var code =
                "workingPixel = this.buffer[xStart | " + layerOffset + "] | 0;" +
                "if ((workingPixel & 0x3800000) <= (currentPixel & 0x1800000)) {" +
                    "lowerPixel = currentPixel | 0;" +
                    "currentPixel = workingPixel | 0;" +
                "}" +
                "else if ((workingPixel & 0x3800000) <= (lowerPixel & 0x1800000)) {" +
                    "lowerPixel = workingPixel | 0;" +
                "}";
                return code;
            }
            function getColorEffects0Layers(doEffects) {
                //Handle checks for color effects here:
                var code = "";
                //No layers:
                if (doEffects) {
                    //Color effects enabled:
                    code +=
                    "this.buffer[xStart | 0] = this.colorEffectsRenderer.process(0, this.gfx.backdrop | 0) | 0;";
                }
                else {
                    //No effects enabled:
                    code +=
                    "this.buffer[xStart | 0] = this.gfx.backdrop | 0;"
                }
                return code;
            }
            function getColorEffectsNoSprites(doEffects) {
                //Handle checks for color effects here:
                var code = "";
                //Rendering with no sprite layer:
                if (doEffects) {
                    //Color effects enabled:
                    code +=
                    "this.buffer[xStart | 0] = this.colorEffectsRenderer.process(lowerPixel | 0, currentPixel | 0) | 0;";
                }
                else {
                    //No effects enabled:
                    code +=
                    "this.buffer[xStart | 0] = currentPixel | 0;";
                }
                return code;
            }
            function getColorEffectsWithSprites(doEffects) {
                //Handle checks for color effects here:
                var code = "";
                //Rendering with a sprite layer:
                code +=
                "if ((currentPixel & 0x400000) == 0) {";
                if (doEffects) {
                    //Color effects enabled:
                    code +=
                    "this.buffer[xStart | 0] = this.colorEffectsRenderer.process(lowerPixel | 0, currentPixel | 0) | 0;";
                }
                else {
                    //No effects enabled:
                    code +=
                    "this.buffer[xStart | 0] = currentPixel | 0;";
                }
                code +=
                "}" +
                "else {" +
                    "this.buffer[xStart | 0] = this.colorEffectsRenderer.processOAMSemiTransparent(lowerPixel | 0, currentPixel | 0) | 0;" +
                "}";
                return code;
            }
            function generatePass(doEffects, layers) {
                var code = "";
                //Special case each possible layer combination:
                switch (layers) {
                    case 0:
                        //Backdrop only:
                        //Color Effects Post Processing:
                        code += getColorEffects0Layers(doEffects);
                        break;
                    case 1:
                        //Generate temps:
                        code += getSingleLayerPrefix();
                        //BG0:
                        code += generateLayerCompareSingle(0x100);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 2:
                        //Generate temps:
                        code += getSingleLayerPrefix();
                        //BG1:
                        code += generateLayerCompareSingle(0x200);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 3:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 4:
                        //Generate temps:
                        code += getSingleLayerPrefix();
                        //BG2:
                        code += generateLayerCompareSingle(0x300);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 5:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 6:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 7:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 8:
                        //Generate temps:
                        code += getSingleLayerPrefix();
                        //BG2:
                        code += generateLayerCompareSingle(0x400);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 9:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 0xA:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 0xB:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 0xC:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 0xD:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 0xE:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 0xF:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //Color Effects Post Processing:
                        code += getColorEffectsNoSprites(doEffects);
                        break;
                    case 0x10:
                        //Generate temps:
                        code += getSingleLayerPrefix();
                        //OBJ:
                        code += generateLayerCompareSingle(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x11:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x12:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x13:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x14:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x15:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x16:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x17:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x18:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x19:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x1A:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x1B:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x1C:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x1D:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    case 0x1E:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                        break;
                    default:
                        //Generate temps:
                        code += getMultiLayerPrefix();
                        //BG3:
                        code += generateLayerCompare(0x400);
                        //BG2:
                        code += generateLayerCompare(0x300);
                        //BG1:
                        code += generateLayerCompare(0x200);
                        //BG0:
                        code += generateLayerCompare(0x100);
                        //OBJ:
                        code += generateLayerCompare(0x500);
                        //Color Effects Post Processing:
                        code += getColorEffectsWithSprites(doEffects);
                }
                return code;
            }
            //Build the code to put inside a loop:
            return generatePass(doEffects, layers);
        }
        function generateLoopHead(compositeType, initCode, bodyCode) {
            var code = "";
            switch (compositeType) {
                //Loop for normal compositor:
                case 0:
                    code +=
                    initCode +
                    "for (var xStart = 0; (xStart | 0) < 240; xStart = ((xStart | 0) + 1) | 0) {" +
                        bodyCode +
                    "}";
                    break;
                //Loop for window compositor:
                case 1:
                    code += "xStart = xStart | 0;" +
                    "xEnd = xEnd | 0;" +
                    initCode +
                    "while ((xStart | 0) < (xEnd | 0)) {" +
                        bodyCode +
                        "xStart = ((xStart | 0) + 1) | 0;" +
                    "}";
                    break;
                //Loop for OBJ window compositor:
                case 2:
                    code += initCode +
                    "for (var xStart = 0; (xStart | 0) < 240; xStart = ((xStart | 0) + 1) | 0) {" +
                        "if ((this.OBJWindowBuffer[xStart | 0] | 0) < 0x3800000) {" +
                            bodyCode +
                        "}" +
                    "}";
            }
            return code;
        }
        //Build the loop:
        return generateLoopHead(compositeType, generateLocalScopeInit(layers), generateLoopBody(doEffects, layers));
    }
    function generateCompositor(compositeType, doEffects) {
        //Get function suffix we'll use depending on color effects usage:
        var effectsPrefix = (doEffects) ? "special" : "normal";
        //Loop through all possible combinations of layers:
        for (var layers = 0; layers < 0x20; layers++) {
            //Codegen the loop:
            var code = generateLoop(compositeType, doEffects, layers);
            //Compile the code and assign to appropriate compositor object:
            switch (compositeType) {
                case 0:
                    //Normal compositor:
                    GameBoyAdvanceCompositor.prototype[effectsPrefix + layers] = Function(code);
                    break;
                case 1:
                    //Window compositor:
                    GameBoyAdvanceWindowCompositor.prototype[effectsPrefix + layers] = Function("xStart", "xEnd", code);
                    break;
                default:
                    //OBJ window compositor:
                    GameBoyAdvanceOBJWindowCompositor.prototype[effectsPrefix + layers] = Function(code);
            }
        }
    }
    function generateCompositors() {
        //Build the functions for each of the three compositors:
        for (var compositeType = 0; compositeType < 3; compositeType++) {
            //Build for the no special effects processing case:
            generateCompositor(compositeType, false);
            //Build for the special effects processing case:
            generateCompositor(compositeType, true);
        }
    }
    //Build and compile all the compositor for every possible layer/effect combination:
    generateCompositors();
}
generateIodineGBAGFXCompositors();

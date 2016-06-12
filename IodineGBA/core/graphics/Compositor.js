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
//Check for SIMD support:
if (typeof SIMD == "object" && typeof SIMD.Int32x4 == "function") {
    GameBoyAdvanceCompositor.prototype.mask0 = SIMD.Int32x4.splat(0);
    GameBoyAdvanceCompositor.prototype.mask1 = SIMD.Int32x4.splat(0x2000000);
    GameBoyAdvanceCompositor.prototype.mask2 = SIMD.Int32x4.splat(0x3800000);
    GameBoyAdvanceCompositor.prototype.mask3 = SIMD.Int32x4.splat(0x1800000);
}
function generateIodineGBAGFXCompositors() {
    function generateCompositors() {
        function generateLoopCheckVectorization(compositeType, doEffects, layers) {
            function generateLoopSIMD(compositeType, doEffects, layers) {
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
                            "var workingPixel = this.mask0;" +
                            "var test1 = SIMD.Bool32x4.splat(true);" +
                            "var test2 = SIMD.Bool32x4.splat(true);";
                        case 0x1:
                        case 0x2:
                        case 0x4:
                        case 0x8:
                        case 0x10:
                            //Need these temps for one or more layers:
                            code +=
                            "var currentPixel = this.mask0;" +
                            "var lowerPixel = this.mask0;";
                    }
                    return code;
                }
                function generateLoopBody(doEffects, layers) {
                    function getSingleLayerPrefix() {
                        //Pass initialization if processing only 1 layer:
                        var code =
                        "lowerPixel = SIMD.Int32x4.splat(this.gfx.backdrop | 0);";
                        return code;
                    }
                    function getMultiLayerPrefix() {
                        //Pass initialization if processing more than 1 layer:
                        var code =
                        "lowerPixel = SIMD.Int32x4.splat(this.gfx.backdrop | 0);" +
                        "currentPixel = lowerPixel;";
                        return code;
                    }
                    function generateLayerCompareSingle(layerOffset) {
                        //Only 1 layer specified to be rendered:
                        var code =
                        "currentPixel = SIMD.Int32x4.load(this.buffer, xStart | " + layerOffset + ");" +
                        "currentPixel = SIMD.Int32x4.select(" +
                            "SIMD.Int32x4.notEqual(" +
                                "this.mask0," +
                                "SIMD.Int32x4.and(currentPixel, this.mask1)" +
                            ")," +
                            "lowerPixel," +
                            "currentPixel" +
                        ");";
                        return code;
                    }
                    function generateLayerCompare(layerOffset) {
                        //Code unit to be used when rendering more than 1 layer:
                        var code =
                        "workingPixel = SIMD.Int32x4.load(this.buffer, xStart | " + layerOffset + ");" +
                        "test1 = SIMD.Int32x4.lessThanOrEqual(" +
                            "SIMD.Int32x4.and(workingPixel, this.mask2)," +
                            "SIMD.Int32x4.and(currentPixel, this.mask3)" +
                        ");" +
                        "lowerPixel = SIMD.Int32x4.select(test1, currentPixel, lowerPixel);" +
                        "currentPixel = SIMD.Int32x4.select(test1, workingPixel, currentPixel);" +
                        "test2 = SIMD.Int32x4.lessThanOrEqual(" +
                            "SIMD.Int32x4.and(workingPixel, this.mask2)," +
                            "SIMD.Int32x4.and(lowerPixel, this.mask3)" +
                        ");" +
                        "lowerPixel = SIMD.Int32x4.select(" +
                            "test1," +
                            "lowerPixel," +
                            "SIMD.Int32x4.select(test2, workingPixel, lowerPixel)" +
                        ");";
                        return code;
                    }
                    function getColorEffects0Layers(doEffects) {
                        //Handle checks for color effects here:
                        var code = "";
                        //No layers:
                        if (doEffects) {
                            //Color effects enabled:
                            code +=
                            "SIMD.Int32x4.store(this.buffer, xStart | 0," +
                                "this.colorEffectsRenderer.processSIMD(" +
                                    "this.mask0," +
                                    "SIMD.Int32x4.splat(this.gfx.backdrop | 0)" +
                                ")" +
                            ");";
                        }
                        else {
                            //No effects enabled:
                            code +=
                            "SIMD.Int32x4.store(this.buffer, xStart | 0, SIMD.Int32x4.splat(this.gfx.backdrop | 0));";
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
                            "SIMD.Int32x4.store(this.buffer, xStart | 0," +
                                "this.colorEffectsRenderer.processSIMD(" +
                                    "lowerPixel," +
                                    "currentPixel" +
                                ")" +
                            ");";
                        }
                        else {
                            //No effects enabled:
                            code +=
                            "SIMD.Int32x4.store(this.buffer, xStart | 0, currentPixel);";
                        }
                        return code;
                    }
                    function getColorEffectsWithSprites(doEffects) {
                        //Handle checks for color effects here:
                        var code = "";
                        //Rendering with a sprite layer:
                        if (doEffects) {
                            //Color effects enabled:
                            code +=
                            "SIMD.Int32x4.store(this.buffer, xStart | 0," +
                                "this.colorEffectsRenderer.processSIMD2(" +
                                    "lowerPixel," +
                                    "currentPixel" +
                                ")" +
                            ");";
                        }
                        else {
                            //No effects enabled:
                            code +=
                            "SIMD.Int32x4.store(this.buffer, xStart | 0," +
                                "this.colorEffectsRenderer.processSIMD3(" +
                                    "lowerPixel," +
                                    "currentPixel" +
                                ")" +
                            ");";
                        }
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
                            "for (var xStart = 0; (xStart | 0) < 240; xStart = ((xStart | 0) + 4) | 0) {" +
                                bodyCode +
                            "}";
                    }
                    return code;
                }
                //Build the loop:
                return generateLoopHead(compositeType, generateLocalScopeInit(layers), generateLoopBody(doEffects, layers));
            }
            function generateLoopScalar(compositeType, doEffects, layers) {
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
                        var code =
                        "lowerPixel = this.gfx.backdrop | 0;";
                        return code;
                    }
                    function getMultiLayerPrefix() {
                        //Pass initialization if processing more than 1 layer:
                        var code =
                        "lowerPixel = this.gfx.backdrop | 0;" +
                        "currentPixel = lowerPixel | 0;";
                        return code;
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
                            //Must handle for semi-transparent sprite case:
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
                            code +=
                            "xStart = xStart | 0;" +
                            "xEnd = xEnd | 0;" +
                            initCode +
                            "while ((xStart | 0) < (xEnd | 0)) {" +
                                bodyCode +
                                "xStart = ((xStart | 0) + 1) | 0;" +
                            "}";
                            break;
                        //Loop for OBJ window compositor:
                        case 2:
                            code +=
                            initCode +
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
            //Check for SIMD support:
            if (typeof SIMD == "object" && typeof SIMD.Int32x4 == "function") {
                //Windowing might render at offsets not friendly to SIMD:
                if (compositeType == 0) {
                    return generateLoopSIMD(compositeType, doEffects, layers);
                }
            }
            //Fallback to scalar codegen:
            return generateLoopScalar(compositeType, doEffects, layers);;
        }
        function generateCompositor(compositeType, doEffects) {
            //Get function suffix we'll use depending on color effects usage:
            var effectsPrefix = (doEffects) ? "special" : "normal";
            //Loop through all possible combinations of layers:
            for (var layers = 0; layers < 0x20; layers++) {
                //Codegen the loop:
                var code = generateLoopCheckVectorization(compositeType, doEffects, layers);
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
        //Build the functions for each of the three compositors:
        for (var compositeType = 0; compositeType < 3; compositeType++) {
            //Build for the no special effects processing case:
            generateCompositor(compositeType, false);
            //Build for the special effects processing case:
            generateCompositor(compositeType, true);
        }
    }
    function generateDispatches() {
        function generateDispatch(coordsSpecified, doEffects) {
            function generateDispatchBlock(coordsSpecified, doEffects) {
                function generateDispatchHead(coordsSpecified) {
                    //Initialize some local variables:
                    var code = "";
                    if (coordsSpecified) {
                        code +=
                        "xStart = xStart | 0;" +
                        "xEnd = xEnd | 0;";
                    }
                    code +=
                    "layers = layers | 0;";
                    return code;
                }
                function generateDispatchBody(coordsSpecified, doEffects) {
                    function generateSwitchHead(bodyCode) {
                        //We're building a switch statement:
                        var code =
                        "switch (layers | 0) {" +
                            bodyCode +
                        "}";
                        return code;
                    }
                    function generateSwitchBody(coordsSpecified, doEffects) {
                        function generateCases(coordsSpecified, doEffects) {
                            function generateCase(layers, coordsSpecified, doEffects) {
                                function generateCaseHead(layers, bodyCode) {
                                    //Building the case label:
                                    var code = "";
                                    if (layers < 0x1F) {
                                        //Not the last case in the list, so specify number:
                                        code +=
                                        "case " + layers + ":" +
                                        "{" +
                                            bodyCode + ";" +
                                            "break" +
                                        "};";
                                    }
                                    else {
                                        //Last case in the list, so place it as default case:
                                        code +=
                                        "default:" +
                                        "{" +
                                            bodyCode +
                                        "}";
                                    }
                                    return code;
                                }
                                function generateCaseBody(layers, coordsSpecified, doEffects) {
                                    //Build the function call:
                                    var code =
                                        "this.";
                                    if (doEffects) {
                                        //Special effects:
                                        code +=
                                        "special";
                                    }
                                    else {
                                        //No special effects:
                                        code +=
                                        "normal";
                                    }
                                    code +=
                                        layers +
                                        "(";
                                    if (coordsSpecified) {
                                        //Passing some xcoords as parameters:
                                        code +=
                                        "xStart | 0, xEnd | 0";
                                    }
                                    code +=
                                        ")";
                                    return code;
                                }
                                //Build the full case unit:
                                return generateCaseHead(layers, generateCaseBody(layers, coordsSpecified, doEffects));
                            }
                            function generateList(coordsSpecified, doEffects) {
                                var code = "";
                                //Loop through all combinations to build:
                                for (var layers = 0; layers < 0x20; layers++) {
                                    //Build a case for the specified combination:
                                    code += generateCase(layers, coordsSpecified, doEffects);
                                }
                                return code;
                            }
                            //Build the entire switch:
                            return generateList(coordsSpecified, doEffects);
                        }
                        //Build the entire switch:
                        return generateCases(coordsSpecified, doEffects);
                    }
                    //Build the switch block:
                    return generateSwitchHead(generateSwitchBody(coordsSpecified, doEffects));
                }
                function generateDispatchCode(coordsSpecified, doEffects) {
                    //Build the dispatch block:
                    var code = "";
                    code += generateDispatchHead(coordsSpecified);
                    code += generateDispatchBody(coordsSpecified, doEffects);
                    return code;
                }
                return generateDispatchCode(coordsSpecified, doEffects);
            }
            function generateDispatchFunc(coordsSpecified, code) {
                if (coordsSpecified) {
                    return Function("xStart", "xEnd", "layers", code);
                }
                else {
                    return Function("layers", code);
                }
            }
            //Generate the function:
            return generateDispatchFunc(coordsSpecified, generateDispatchBlock(coordsSpecified, doEffects));
        }
        //Build the functions for each of the six dispatches:
        GameBoyAdvanceOBJWindowCompositor.prototype.renderNormalScanLine = GameBoyAdvanceCompositor.prototype.renderNormalScanLine = generateDispatch(false, false);
        GameBoyAdvanceWindowCompositor.prototype.renderNormalScanLine = generateDispatch(true, false);
        GameBoyAdvanceOBJWindowCompositor.prototype.renderScanLineWithEffects = GameBoyAdvanceCompositor.prototype.renderScanLineWithEffects = generateDispatch(false, true);
        GameBoyAdvanceWindowCompositor.prototype.renderScanLineWithEffects = generateDispatch(true, true);
    }
    //Build and compile the compositors for every possible mode/layer/effect combination:
    generateCompositors();
    //Build and compile the dispatches for every possible mode/effect combination:
    generateDispatches();
}
generateIodineGBAGFXCompositors();

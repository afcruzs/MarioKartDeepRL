var zip = new JSZip();
var memoryFolder = zip.folder("memory");
var imgFolder = zip.folder("img");
var fileCounter = 0;

function saveZip(fileName) {

    zip.generateAsync({type:"blob"})
        .then(function(content) {
            // see FileSaver.js
            saveAs(content, fileName + ".zip");
        });

    zip = new JSZip();
    memoryFolder = zip.folder("memory");
    imgFolder = zip.folder("img");
}

function makeRequest(url, method, data, on_success, on_error) {
    var xhr = new XMLHttpRequest();

    xhr.open(method, url);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            on_success(JSON.parse(xhr.response));
        } else {
            on_error({
                status: xhr.status,
                data: xhr.response
            });
        }
    };
    xhr.onerror = function () {
        on_error({
            status: xhr.status,
            data: xhr.response
        });
    };
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(data));
}

function startRecording() {
    var canvas = document.getElementById("emulator_target");
    var prefix = "data:image/png;base64,";
    var baseUrl = 'http://localhost:5000/'

    makeRequest(baseUrl + 'game-id', 'POST', null, function(data) {
        var gameId = data.id;
        console.log(data);
        console.lo
        setInterval(function () {
            if (IodineGUI.Iodine.emulatorStatus & 0xF) {
                var memory = IodineGUI.Iodine.IOCore.memory;

                var internalRAM = new Uint8Array(memory.internalRAM);
                //var externalRAM = new Uint8Array(memory.externalRAM);
                //var biosMemory = new Uint8Array(memory.BIOS);

                /* memoryFolder.file("mem" + fileCounter + ".dat", internalRAM, {binary: true});
                imgFolder.file("img" + fileCounter + ".png",
                    canvas.toDataURL().substr(prefix.length), {base64: true});
                    */

                makeRequest(baseUrl + 'frame-data', 'POST', {
                    memory: internalRAM,
                    game_id: gameId,
                    image_base64: canvas.toDataURL().substr(prefix.length)
                }, function () {

                }, function (data2) {
                    console.log("Frame not sent");
                    console.log(data2);
                });
                /*
                 zip.generateAsync({type:"blob"})
                 .then(function(content) {
                 // see FileSaver.js
                 saveAs(content, "example.zip");
                 });
                 */
                fileCounter += 1;
            }
        }, 1000);
    }, function (data) {
        console.log("Error: ");
        console.log(data);
    });
}
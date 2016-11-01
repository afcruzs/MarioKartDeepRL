var zip = new JSZip();
var memoryFolder = zip.folder("memory");
var fileCounter = 0;

function saveZip(fileName) {

    zip.generateAsync({type:"blob"})
        .then(function(content) {
            // see FileSaver.js
            saveAs(content, fileName + ".zip");
        });

    zip = new JSZip();
    memoryFolder = zip.folder("memory");
}

function startRecording(){
    setInterval(function () {
        if (IodineGUI.Iodine.emulatorStatus & 0xF) {
            var memory = IodineGUI.Iodine.IOCore.memory;

            var internalRAM = new Uint8Array(memory.internalRAM);
            //var externalRAM = new Uint8Array(memory.externalRAM);
            //var biosMemory = new Uint8Array(memory.BIOS);

            memoryFolder.file("mem" + fileCounter + ".dat", internalRAM, {binary: true});

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
}

var mapButtontoIndex = {"a":0, "b":1, "select":2, "start":3, "right":4, "left": 5, "up":6 ,"down":7, "r":8, "l":9};
var SpeechRecognition =  SpeechRecognition ||
					  webkitSpeechRecognition ||
					  mozSpeechRecognition ||
					  msSpeechRecognition ||
					  oSpeechRecognition;

if (SpeechRecognition){
	recognition = new SpeechRecognition();
	recognition.maxAlternatives = 30;
	recognition.continuous = true;
	recognition.lang = 'en-US';

	recognition.onstart = function() {
		console.log("start");
	};

	recognition.onerror = function(event) {
		console.log(event);
	};

	recognition.onend  = function() {
		console.log("end");
		recognition.start();
	};


	var controlRegex = new RegExp(/(?:press|push)(?:\sthe)?(?:\sbutton|\skey)?\s(\w+)/, 'i');
	handleButton = function(result) {
		var match = controlRegex.exec(result);
		if (match != null){
			var key = match[1].toLowerCase();
			if (key in mapButtontoIndex){
				pressButton(key, 20);
				return true;
			}
		}
		return false;
	}

	// var fullScreenRegex = new RegExp(/fullscreen|full-screen/, 'i');
	// handleFullscreen = function(result) {
	// 	console.log("fullscreen handler");
	// 	if (fullScreenRegex.test(result)){
	// 		toggleFullScreen();
	// 		return true;
	// 	}
	// 	return false;
	// }

	var settingsRegexOne = new RegExp(/(increase|up|decrease|down)(?:\sthe)?\s(volume|speed)(\sby\s(\w+))?/, 'i');
	var settingsRegexTwo = new RegExp(/(?:set|move|get)(?:\sthe)?\s(volume|speed)(?:\sto)?\s(\w+)/, 'i');
	handleSettings = function(result) {
		var matchOne = settingsRegexOne.exec(result);
		var matchTwo = settingsRegexTwo.exec(result);
		if(matchOne != null){
			var action = matchOne[1].toLowerCase();
			var obj = matchOne[2].toLowerCase();
			var num = matchOne[4];
			if( isNaN(num) ){
				num = 0.1;
			}
			else{
				num = parseInt(num) / 100;
			}
			if (action == "increase" || action == "up"){
				num = num;
			}
			else{
				num = -num;
			}
			if (obj == "volume"){
				stepVolume(num);
			}
			else{
				IodineGUI.Iodine.incrementSpeed(num);
			}
			return true;
		}

		if(matchTwo != null){
			var obj = matchTwo[1].toLowerCase();
			var num = matchTwo[2];
			if( isNaN(num) ){
				num = 0.1;
			}
			else{
				num = parseInt(num) / 100;
			}
			if (obj == "volume"){
				stepVolume(-1);
				stepVolume(num);
			}
			else{
				IodineGUI.Iodine.setSpeed(num);
			}
			return true;
		}
		return false;
	}

	var RegexFunc = [handleButton, handleSettings];

	handleResults = function(results) {
		console.log(results);

		var handled = false;
		for (var k = 0; k < results.length; k++){
			var result = results[k];
			for (var funcIndex = 0; funcIndex < RegexFunc.length; funcIndex++){
				if (RegexFunc[funcIndex](result) ) {
					handled = true;
					break;
				} 
			}
			if (handled){
				break;
			}
		}
	}

	recognition.onresult  = function(event) {
		console.log('result');
        var SpeechRecognitionResult = event.results[event.resultIndex];
        var results = [];
        for (var k = 0; k<SpeechRecognitionResult.length; k++) {
          results[k] = SpeechRecognitionResult[k].transcript;
        }
        handleResults(results);
	};

	recognition.start();

}





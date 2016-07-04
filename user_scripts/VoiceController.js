if(annyang){

	pressKeyFunctionConstructor = function(key){
		key = key.toLowerCase()
		var func = function(){
			pressButton(key,20);
		};
		return func;
	}

	handleButton = function(key){
		//lower case the key to ignore capitals
		key = key.toLowerCase();
		pressButton(key, 20);
	}

	var mapButtontoIndex = {"a":0, "b":1, "select":2, "start":3, "right":4, "left": 5, "up":6 ,"down":7, "r":8, "l":9};

	var commands = {};

	for (var key in mapButtontoIndex){
		commands[key] = pressKeyFunctionConstructor(key);
	}
	commands["press (the) button *key"] = handleButton;
	commands["press (the) key *key"] = handleButton;



  	// Add our commands to annyang
	annyang.addCommands(commands);
 	annyang.start();
}
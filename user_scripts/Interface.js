var mapButtontoIndex = {"a":0, "b":1, "select":2, "start":3, "right":4, "left": 5, "up":6 ,"down":7, "r":8, "l":9}

function pressButton(button, time) {

	if( button in mapButtontoIndex ){

		index = mapButtontoIndex[button]	
		IodineGUI.Iodine.keyDown(index);

		setTimeout(function() {
			IodineGUI.Iodine.keyUp(index);
		}, time);
	}

	return;
}
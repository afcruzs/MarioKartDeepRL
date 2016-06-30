var mapButtontoIndex = {"A":0, "B":1, "Select":2, "Start":3, "Right":4, "Left": 5, "Up":6 ,"Down":7, "R":8, "L":9}

function pressButton(button, time) {

	if(button in mapButtontoIndex ){
		
		index = mapButtontoIndex[button]	
		IodineGUI.Iodine.keyDown(index);

		setTimeout(function() {
			IodineGUI.Iodine.keyUp(index);
		}, time);
	}

	return;
}
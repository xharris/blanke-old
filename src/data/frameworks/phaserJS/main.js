function project_new(){

}

function project_open(){
	
}

function library_delete(category,obj){
	console.log("delete that "+obj);
}

function library_edit(category,obj){
	var obj = getLobjByName(category,obj);
}

// return [str name, dict info]
function library_add(info){
	switch(info['category']){
		case 'object':
			// nothing
			break;
		case 'sound':
			// open file dialog
			break;

		case 'image':
			// open file dialog
			break;
	}
	return info;
}

var pj_saved = true;


function _project_new(){
	if(!pj_saved){
		show_modal('save_project',{
		      onDeny: function(){
		        console.log('new project cancelled');
		      },
		      onApprove: function(){
		        setup_newproject();
		      }
		    }
	    );
	}else{
		setup_newproject();
	}
}

function _project_save(){
	// call custom function if it exists
	if(typeof project_save == 'function'){
		project_save()
	}

	if(project_path == ''){
		saveFileDialog(saveProject);
	}else{
		saveProject(project_path)
	}	
}

function saveFileDialog(callback,defaultPath){
	defaultPath = defaultPath || path.dirname(process.execPath)
	$('#nw_savefiledialog')[0].nwworkingdir=path.dirname(process.execPath);
	$('#nw_savefiledialog').click();
	$('#nw_savefiledialog').change(function(evt){
		callback(evt.currentTarget.value);
	});
}

function saveProject(folder_path){
	folder_path = folder_path || project_path;
	var pj_name = getSetting('game','name');

	if(project_path == ''){
		project_path = path.resolve(folder_path,pj_name);
	}

	// make the project folder
	fs.mkdir(project_path)

	// change lobjects
	var save_data = lobjects

	// add entities to lobjects
	save_data['entities'] = {};
	for(s in lobjects['state']){
		var name = lobjects['state'][s]['orig_name']
		save_data['entities'][name] = []
		for(ent in entities[name]){
		    save_data['entities'][name].push(entities[name][ent].serialize());
		}
	}

		

	// write main file
	var save_data = JSON.stringify(lobjects)
	fs.writeFile(path.resolve(project_path,pj_name+'.blnk'),save_data)

	// add resource folders (resouces should be added upon loading into ide)
	for(cat in categories){
		if(['object','state'].indexOf(categories[cat]) < 0){
			fs.mkdir(path.resolve(project_path,categories[cat]))
		}
	}
}


function openFileDialog(callback,defaultPath){
	defaultPath = defaultPath || path.dirname(process.execPath)
	$('#nw_openfiledialog')[0].nwworkingdir=path.dirname(process.execPath);
	$('#nw_openfiledialog').click();
	$('#nw_openfiledialog').change(function(evt){
		callback(evt.currentTarget.value);
	});
}

function _project_open(){
	openFileDialog(openProject)
}

function openProject(location){
	setup_newproject()

	// read .blnk file
	var load_data = JSON.parse(fs.readFileSync(location,"utf8"));

	// call custom function if it exists
	if(typeof project_open == 'function'){
		project_open()
	}

	if(load_data){
		// specific categories get specific treatment
		var data_keys = Object.keys(load_data)
		for(var key in data_keys){
			if(data_keys[key] == 'entities'){

				// ENTITIES 
				for(state in load_data['entities']){
					var ent_data = load_data['entities'][state]
					entities[state] = []
					curr_state = state
					// deserialize the entities into entities dictionary
					var new_ent = null;
					for(ent in load_data['entities'][state]){
						new_ent = new canv_Object()
						new_ent.deserialize(load_data['entities'][state][ent])
						entities[state].push(new_ent)
					}
				}
			}else{
				if(data_keys[key] == 'settings'){

				}else{
					for(obj in load_data[data_keys[key]]){
						lib_addObject(data_keys[key],load_data[data_keys[key]][obj])
					}
				}
			}
		}
	
		refreshEntities()
		moveEntitiesToCamera()
	}

	console.log(lobjects)
}

function setup_newproject(){
	canv_destroyCanvas()

	lobjects['settings'] = {}

	// get the ide settings
	lobjects['settings']['ide'] = {
	 	'width': 640,
	 	'height': 480,
		'grid_width': 32,
		'grid_height': 32,
		'grid_color': '0xE6E6E6'
	};
	
	
    // add categories to tree
    for(cat in categories){
    	// delete old one
    	$(".jstree").jstree("delete_node","#"+categories[cat]+"s");

    	// add new one
    	lib_addCategory(categories[cat]);
    }
    resetProperties();

    lobjects['settings']['game']= {
    	'name':'project_test'
    }

	project_new();
	pj_saved = false;
}


var gui = require('nw.gui');
var fs = require('fs');
var path = require('path');

var win = gui.Window.get();

var isMaximized = false;
var grid = null;

var framework = "";
var fwork_path = "";
var config = null;
var categories = null;

var stage = null;

var lobjects = {};
var lib_selected_obj = 0;
var curr_state = '';
var entities = {};

var project_path = '';

//openDevTools();

function setFramework(name){
    framework = name;
    fwork_path = path.resolve('data','frameworks',framework);

    //get main.js file
    var imported = document.createElement('script');
    imported.src = path.resolve(fwork_path,'main.js');
    document.head.appendChild(imported);

    // get framework modals   <link rel="import" href="/path/to/imports/stuff.html">
    var modal_html = document.createElement('link');
    modal_html.rel = "import";
    modal_html.href = path.resolve(fwork_path,"elements.html");
    modal_html.onload = function(){
      $("#frameworkModals").replaceWith(document.querySelector('link[rel="import"]').import.body.innerHTML);
    };
    document.head.appendChild(modal_html);

    //get config.json data
    configJSON = fs.readFileSync(path.resolve(fwork_path,'config.json'),'utf8');
    config = JSON.parse(configJSON);
    categories = config.categories;

    var array = $.map(config , function(value, index) {
      return [value];
    });
}

function lib_click(category,obj){
  lib_selected_obj = obj.srcElement;
  if(category == 'objects'){
    // set selected object for canvas placer
    canv_setSelectedObject(lib_selected_obj);
  }else{
    // reset canvas placer
    canv_resetSelectedObject();
  }
  if(category == 'states'){
    var obj = getLobjByName(category.substring(0,category.length-1),obj_getName(lib_selected_obj));
    // set the current state
    if(curr_state != obj['orig_name']){
      curr_state = obj['orig_name']; 
    
      // set objects in the state visible and vice versa
      refreshEntities()
    }

    moveEntitiesToCamera();
  }
  setProperties(category,setLobjectProperties);
}

function show_modal(name,options){
  options['selector'] = {
        close    : '.close, .actions .button',
        approve  : '.actions .positive, .actions .approve, .actions .ok',
        deny     : '.actions .negative, .actions .deny, .actions .cancel'
        }
  options['closable'] = false;
  $('.ui.modal').modal(
          options
      );
  $('#modal_'+name).modal('show');
}

function _library_edit(category,obj){
  show_modal('edit_'+category,{});
  window["edit_"+category](obj);
}

// library tree useful functions

function lib_getTree(){
  var tree = JSON.stringify($(".jsTree").jstree("get_json"));
  var dict = [];
}
function lib_getSelected(){
  return $(".jsTree").jstree("get_selected");
}
function obj_getName(obj){
  return $(".jsTree").jstree("get_text",obj);
}
function name_getObj(name){
  return $(".jsTree").jstree(true).get_node(name);
}
function lib_addObject(category,info){
  info = info || 0;
  // is a new object being created or loading object from file?
  var is_new = false;
  if(info == 0){
    is_new = true;
    info = {};
    var properties_array = config.properties[category];
    var prop = 0;

    for(p in properties_array){
      prop = properties_array[p];
      info[prop[1]] = prop[2];
    }
  }
  // categories that recieve special icons (so far)
  var icons = {
    'image':'image',
    'sound':'audio'
  };
  var obj_icon = '';

  // set the icon for the object
  if(Object.keys(icons).indexOf(category) > -1){
    obj_icon = 'fa fa-file-'+icons[category]+'-o icon';
  }else{
    obj_icon = 'fa fa-file-o icon';
  }

  info['category'] = category;
  var new_info = info;

  if(is_new){
    // figure out the new object name

    var obj_name = category+lobjects[category].length;
    /* check for duplicate names * ADD LATER *
    for(o in lobjects[category]){
      if
    }
    */
    info['name'] = obj_name;
    info['orig_name'] = obj_name;

    // call the framework function
    new_info = library_add(info);
  }

  // if it's a state add an array to entities
  if(category == 'state'){
    entities[obj_name] = [];
    curr_state = obj_name;
  }

  // init canvas it it's the first state
  if(category == 'state' && lobjects['state'].length == 0){
    canv_setupNew()
  }

  // add to the lobject array
  lobjects[category].push(new_info);

  // set up the node
  var node = {text:new_info['name'],icon:obj_icon};
  // add the node
  $(".jsTree").jstree("create_node","#"+category+'s',node,'last');
  $(".jsTree").jstree("open_node","#"+category+'s');
}

function lib_deleteObject(object,category){
  console.log(object)
  console.log(category)

  category = category || ''
  if(object != 0){
    
    // delete in library
    for(cat in categories){
      for(o in lobjects[categories[cat]]){
        var obj = lobjects[categories[cat]][o];
        if(obj['orig_name'] == obj_getName(object)){

          // is category specified?
          if(category == ''){
            delete lobjects[categories[cat]][o];
            lobjects[categories[cat]].splice(o)
          }else{
            if(categories[cat] == category){
              delete lobjects[categories[cat]][o];
              lobjects[categories[cat]].splice(o)
            }
          }
        
        }
      }
    }
;
   
    // last state? destroy canvas
    console.log(lobjects)
    if(lobjects['state'].length == 0){
      canv_destroyCanvas()
    }

    // delete in tree
    $(".jstree").jstree("delete_node",object)

  }
}

function lib_addCategory(name){
  // create the lobjects array
  lobjects[categories[cat]] = [];
  // add to the tree
  name += 's';
  var node = {id:name,text:name,icon:'fa fa-folder-o icon'};
  return $(".jsTree").jstree("create_node","#",node);
}

////

function getLobjByName(category,obj_name){
  for(o in lobjects[category]){
    var obj = lobjects[category][o];
    if(obj['name'] == obj_name){
      return obj;
    }
  }
  return 0;
}

function getLobjByOrigName(category,obj_origname){
  for(o in lobjects[category]){
    var obj = lobjects[category][o];
    if(obj['orig_name'] == obj_origname){
      return obj;
    }
  }
  return 0;
}


// possible values dictionary 
// [
//    [type, name, default value]
//    Types: text, int
// ]
//
var prop_callback = 0;
var prop_type = '';
function setProperties(type,callback){
  var div_properties = document.getElementById('form_properties');
  prop_callback = callback;
  prop_type = type;
  // take off the trailing S
  type = type.substring(0,type.length-1);

  // construct html properties
  var selected_obj = getLobjByName(type,obj_getName(lib_selected_obj));
  var properties_array = config.properties[type];
  var html_str = "";
  var prop = 0;

  for(p in properties_array){
    prop = properties_array[p];
    switch(prop[0]){
      case "text":
        html_str += prop[1]+"<input id='prop"+p+"' name='"+prop[1]+"' type='text' value='"+selected_obj[prop[1]]+"'/>";
        break;
      case "int":
        html_str += prop[1]+"<input id='prop"+p+"' name='"+prop[1]+"' type='number' value="+selected_obj[prop[1]]+" />";
        break;
    }
  }

  html_str += "<input type='submit' value='UPDATE'/>"

  // set it
  div_properties.innerHTML = html_str;
}

function resetProperties(){
  document.getElementById('form_properties').innerHTML = "";
}

$(document).ready(function() {
  $('#form_properties').on('submit', function(e) {
    e.preventDefault();
    prop_callback(document.form_properties);
  });
});

function setLobjectProperties(values){
  var obj = getLobjByName(prop_type.substring(0,prop_type.length-1),obj_getName(lib_selected_obj));
  
  var properties_array = config.properties[prop_type.substring(0,prop_type.length-1)];
  var prop = 0;

  for(p in properties_array){
    prop = properties_array[p];
    obj[prop[1]] = values[prop[1]].value;
    // change object name in tree
    if(prop[1] == 'name'){
      $(".jstree").jstree("rename_node",lib_selected_obj,values[prop[1]].value);
    }
  }
}

function setStatus(msg){
  msg = msg || '';
  document.getElementById('status_bar').innerHTML = msg;
}

function updateTree(){
  
}

// create a folder under category
function createFolder(){

}

function btn_AddObject(){
  // get the currently selected category
  var selected_cat = obj_getName(lib_getSelected());

  // is a category selected or specified?
  if(selected_cat != false){
    selected_cat = selected_cat.substring(0,selected_cat.length-1);
    lib_addObject(selected_cat);
  }
}

function btn_DeleteObject(){
  console.log(obj_getName(lib_selected_obj));
  if(lib_selected_obj != 0){
    show_modal('del_obj',
      {
        onDeny: function(){
          console.log("not deleted");
        },
        onApprove: function(){
          lib_deleteObject(lib_selected_obj,'');
          resetProperties();
        }
      }
    );
  }
}

function getSetting(type,setting){
  return lobjects['settings'][type][setting];
}

function windowClose(){
  win.close();
}

function winMinimize(){
  win.minimize();
}

function winResize(){
	if(isMaximized){
  	win.unmaximize();
	}else{
  	win.maximize();
	}
}

win.on('maximize', function(){
    isMaximized = true;
});

win.on('unmaximize', function(){
    isMaximized = false;
});

function openDevTools(){
  win.showDevTools();
}

function showContextMenu(x,y,items){
  x = typeof x !== 'undefined' ? x : 0;
  y = typeof y !== 'undefined' ? y : 0;
  items = typeof items !== 'undefined' ? items : [];

  var menu = new gui.Menu();
  for(item in items){
    menu.append(new gui.MenuItem(items[item]));
  }
  menu.popup(x,y);
}


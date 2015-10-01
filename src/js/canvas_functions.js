var selected_obj = 0;

var camera = [0,0];
var moving_camera = false;
var cam_beforecam = [0,0];
var cam_startmouse = [0,0];

var MB_LEFT = 0;
var MB_MIDDLE = 1;
var MB_RIGHT = 2;

var mouse_x = 0;
var mouse_y = 0;

// Stage Children
var line = 0;

// Status parts
var stat_stage = '';
var stat_object = '';

var old_canvas_element = null;

function canv_initCanvas(){
  stage = new createjs.Stage("game_canvas");
  stage.addEventListener("stagemousemove", canv_mouseMove);
  stage.addEventListener("mouseenter", canv_mouseEnter);    
  stage.addEventListener("mouseleave", canv_mouseLeave);  

  stage.on("stagemousedown", canv_mouseDown); 
  stage.on("stagemouseup", canv_mouseUp); 

  var ctx = document.getElementById("game_canvas");
  ctx.addEventListener('mousewheel',canv_mouseWheel, false);

  line = new createjs.Shape();
  stage.addChild(line);

  createjs.Ticker.addEventListener("tick", tick);
  createjs.Ticker.setFPS(120);

  stage.enableMouseOver();
}

function canv_setupNew(){
  // set up the canvas anew
  canv_initCanvas();
  canv_ResizeStage(getSetting('ide','width'),getSetting('ide','height'));
  canv_Redraw(getSetting('ide','grid_width'),getSetting('ide','grid_height'));
}

function canv_destroyCanvas(){
  delete stage;
  var ctx = document.getElementById("game_canvas");
  ctx.width  = 0;
  ctx.height = 0;
}

function canv_ResizeStage(width,height){
  var rightPane = document.getElementById("rightPane");
  var ctx = document.getElementById("game_canvas");
  ctx.width  = screen.width;
  ctx.height = screen.height;
}
var scale = 1.0;
function canv_mouseWheel(evt){
  var ctx = document.getElementById("game_canvas");
  // scroll up (zoom in)
  if(evt.wheelDelta < 0){
    scale -= 0.05;
  }
  if(evt.wheelDelta > 0){
    scale += 0.05;
  }
  canv_Redraw();
  return false; 
}

function canv_Redraw(){
  var ctx = document.getElementById("game_canvas");
  stage.setTransform(0,0,scale,scale);

  line.graphics.clear();
  //var graphics = new createjs.Graphics();
  line.graphics.setStrokeStyle(1);
  line.graphics.beginStroke('#7f7f7f');
  
  var snapx = getSetting('ide','grid_width');
  var snapy = getSetting('ide','grid_height');

  var snappedx, snappedy;
  snappedx = Math.floor(camera[0]/snapx)*snapx;
  snappedy = Math.floor(camera[1]/snapy)*snapy;

  var origin_thickness = 3;

  // vertical lines
  for(gx=-snappedx;gx<(ctx.width/Math.abs(scale))-snappedx; gx+=getSetting('ide','grid_width')){
    // origin 
    if(gx == 0){
      line.graphics.setStrokeStyle(origin_thickness);
    }else{line.graphics.setStrokeStyle(1);}
    line.graphics.moveTo(gx+camera[0],0).lineTo(gx+camera[0], ctx.height/Math.abs(scale));
  }

  // horizontal lines
  for(gy=-snappedy;gy<(ctx.height/Math.abs(scale))-snappedy; gy+=getSetting('ide','grid_height')){
    // origin 
    if(gy == 0){
      line.graphics.setStrokeStyle(origin_thickness);
    }else{line.graphics.setStrokeStyle(1);}
    line.graphics.moveTo(0, gy+camera[1]).lineTo(ctx.width/Math.abs(scale), gy+camera[1]);
  }

  // view lines
  line.graphics.beginStroke('#000000');
  line.graphics.moveTo(0,0).lineTo(0,ctx.height);
  line.graphics.moveTo(0,0).lineTo(ctx.width,0);

}

function canv_setSelectedObject(obj){
  selected_obj = new canv_Object(0,0,getLobjByName('object',obj_getName(obj)));
  selected_obj.setVisible(false);
  selected_obj.mouseOver = function(){console.log('nothin')}
}

function canv_resetSelectedObject(){
  selected_obj = 0;
}

function canv_StartMoveCam(){
  moving_camera = true;
  cam_beforecam = camera;
  cam_startmouse = [mouse_x/Math.abs(scale),mouse_y/Math.abs(scale)]; 
}

function canv_EndMoveCam(){
  moving_camera = false;
}

function canv_mouseMove(evt){
  mouse_x = evt.stageX;
  mouse_y = evt.stageY;
  // move object placer
  if(selected_obj != 0){
    if(key.ctrl){
      // freely move
      selected_obj.position(mouse_x/Math.abs(scale),mouse_y/Math.abs(scale));
    }else{
      // snap to grid
      var snapx = getSetting('ide','grid_width');
      var snapy = getSetting('ide','grid_height');

      var snappedx, snappedy;
      snappedx = Math.floor(((mouse_x/Math.abs(scale))-camera[0])/snapx)*snapx;
      snappedy = Math.floor(((mouse_y/Math.abs(scale))-camera[1])/snapy)*snapy;

      selected_obj.position(snappedx+camera[0],snappedy+camera[1]);
    }
  }

  // move camera if middle mouse down
  if(moving_camera){
    camera = [((mouse_x/Math.abs(scale))-cam_startmouse[0])+cam_beforecam[0],((mouse_y/Math.abs(scale))-cam_startmouse[1])+cam_beforecam[1]];
    
    moveEntitiesToCamera();
  }
}

function refreshEntities(){
  // refresh canvas things
  for(s in lobjects['state']){
    for(ent in entities[lobjects['state'][s]['orig_name']]){
      var e = entities[lobjects['state'][s]['orig_name']][ent];
      if(e.state == curr_state){
        e.setVisible(true);
      }else{
        e.setVisible(false);
      }
    }
  }
}

function moveEntitiesToCamera(){
  // go through all entities
  for(ent in entities[curr_state]){
    var e = entities[curr_state][ent];
    e.position(e.stateX+camera[0],e.stateY+camera[1])
  }
  canv_Redraw();
}

function refreshEntitiesProperties(obj_name){
  for(ent in entities[curr_state]){
    var e = entities[curr_state][ent];
    if(e.lobj['name'] == obj_name){
      e.propertiesChanged()
    }
  }
}

function canv_mouseEnter(evt){
  if(selected_obj != 0){
    selected_obj.setVisible(true);
  }
}

function canv_mouseLeave(evt){
  if(selected_obj != 0){
    selected_obj.setVisible(false);
  }
}

function canv_mouseDown(evt){
  if(evt.nativeEvent.button == MB_MIDDLE){
    // can move camera
    canv_StartMoveCam();
  }
}

function canv_mouseUp(evt){
  if(evt.nativeEvent.button == MB_MIDDLE){
    canv_EndMoveCam();
  }
  if(evt.nativeEvent.button == MB_LEFT){
    if(selected_obj != 0 && selected_obj.visible){
      var new_obj = new canv_Object(selected_obj.bitmap.x,selected_obj.bitmap.y,getLobjByName('object',obj_getName(lib_selected_obj)))
      entities[curr_state].push(new_obj);
    }
  }
}

function canv_Object (x,y,library_obj) {
  this.x = x;
  this.y = y;

  this.stateX = x-camera[0];
  this.stateY = y-camera[1];

  this.lobj = library_obj;

  this.image = new Image();
  this.image.src = 'data/images/NA.png';
  this.bitmap = new createjs.Bitmap(this.image);
  this.bitmap.x = x || 0;
  this.bitmap.y = y || 0;

  this.state = curr_state;

  /*
  this.rect = new createjs.Graphics();
  this.rect.setStrokeStyle(1)
  this.rect.beginStroke("Blue");

  //this.rect.drawRect(this.image.x,this.image.y,this.image.width,this.image.height);
  this.rect.drawRect(10,10,20,20);
  this.rect.endFill();
 */
  this.visible = true;
  
  this.image.onload = function(){ 
    stage.update() 
  };

  this.mouseOver = function(call_obj){
    setStatus(call_obj.lobj['name'])
  }

  var self = this;

  this.bitmap.addEventListener('mouseover',function(){
    self.mouseOver(self);
  });

  this.bitmap.addEventListener('rollout',function(){
    if(self.visible){
      setStatus('');
    }
  })
   
  stage.addChild(this.rect);
  stage.addChild(this.bitmap);

  this.setVisible = function(visible){
    this.bitmap.visible = visible || !this.bitmap.visible;
    this.visible = this.bitmap.visible;
  }

  this.position = function(x,y){
    this.rect.graphics.beginStroke("Blue");
    this.rect.graphics.drawRect(this.bitmap.x,this.bitmap.y,this.bitmap.width,this.bitmap.height);
    this.rect.graphics.endFill();

    this.bitmap.x = x;
    this.bitmap.y = y;
  }

  this.propertiesChanged = function(){
    
  }

  this.serialize = function(){
    return {
      'x':this.x,
      'y':this.y,
      'lobject_name':this.lobj['orig_name'],
      'state':this.state
    }
  }
  this.deserialize = function(data){
    this.x = data['x']
    this.y = data['y']
    this.lobj = getLobjByOrigName('object',data['lobject_name'])
    this.state = data['state']

    this.stateX = data['x']-camera[0];
    this.stateY = data['y']-camera[1];

    this.position(this.x,this.y);
  }
}


space_down = false;
function tick(event) {
  if(key.isPressed("space")){
    if(!space_down){
      space_down = true;
      canv_StartMoveCam();
    }
  }else{
    if(space_down){
      space_down = false;
      canv_EndMoveCam();
    }
  }

  stage.update(event);
}

function btn_ResetPlacer(){
  selected_obj = 0;
}
var nodes = new vis.DataSet();
var edges = new vis.DataSet();
var network = null;

function draw(data) {
  // create a network
  var container = document.getElementById('network');

  if (data == undefined) {
    data = {
	  nodes: nodes,
	  edges: edges
    };
  } else {
	nodes.add(data.nodes),
	edges.add(data.edges)
  }

  var options = {
	stabilize: false,
	physics: {
	  barnesHut: {
		gravitationalConstant:0,
		springConstant:0,
		centralGravity:0
	  }
	},
	smoothCurves: {
	  dynamic:false,
	  type: "continuous"
	},
        
	dataManipulation: true,
	onAdd: function(data, callback) {
	  var shapeInput = document.getElementById('node-shape');
	  var labelInput = document.getElementById('node-label');
	  
	  if (shapeInput.value == 'image') {
		//get url here
	  }

	  data.shape = shapeInput.value;
	  data.label = labelInput.value;
	  callback(data);
	},
	onEdit: function(data,callback) {
		onEdit(data,callback);	
	},
	onConnect: function(data,callback) {
	  if (data.from == data.to) {
		var r=confirm("Do you want to connect the node to itself?");
		if (r==true) {
		  callback(data);
		}
	  }
	  else {
		callback(data);
	  }
	}
  };

  // Create the network and override the toolbar function
  network = new vis.Network(container, data, options);
  network._createManipulatorBar = _createManipulatorBar.bind(network)
  network._createManipulatorBar()

  // add event listeners
  network.on('select', function(params) {
	document.getElementById('selection').innerHTML = 'Selection: ' + params.nodes;
  });

  
  var submitButtom = document.getElementById('submitButton');
  $(submitButton).on('click', function(e) {
	e.preventDefault();
	var input = $('#searchForm').serialize();
	$.ajax({
	  url: "http://localhost:8983/solr/collection1/select",
	  jsonp: "json.wrf",
	  dataType: "jsonp",
	  data: input,
	  success: function(response) {
		displayResults(response);
	  }
	})
  })

};


/*********************************************************************/
/*                        SEARCH FUNCTIONS                           */
/*********************************************************************/

function displayResults(result) {
	/*
	var data = result.response;
	var html = "<ul>"
	console.log(data.docs)
	for(var i = 0; i < data.docs.length; i++) {
		var entry = data.docs[i]
		html += "<li value="+entry.id+">"+entry.id.substring(2)+"</li>"
	}
	html += "</ul>"
	*/
	
	var data = result.response;
    var html = "<dl>"
    console.log(data.docs)
    for(var i = 0; i < data.docs.length; i++) {
        var entry = data.docs[i];
		var pathToks = entry.id.split("/");
		var formattedDateTime = new Date(entry.lastModified);
		html += "<a href="+entry.id+">"+pathToks[pathToks.length-1]+"</a>"
        html += "<dt>"+pathToks[pathToks.length-1]+"</dt>"
        html += "<dd>author: "+entry.author+"..."+"</dd>"
        html += "<dd>"+formattedDateTime.toString()+"</dd>"
        html += "<dd>"+entry.text[0].substring(0,120)+"..."+"</dd>"
    }
    html += "</dl>";
    
	document.getElementById('searchResult').innerHTML = html;

	$('#searchResult').on('click', function () {
		//enable edit mode
		console.log("click")
		onAdd.call(network);
	})
}


/*********************************************************************/
/*                        MAIN TOOLBAR                               */
/*********************************************************************/


_createManipulatorBar = function() {
  // remove bound functions
  if (network.boundFunction) {
    network.off('select', network.boundFunction);
  }

  if (network.edgeBeingEdited !== undefined) {
    network.edgeBeingEdited._disableControlNodes();
    network.edgeBeingEdited = undefined;
    network.selectedControlNode = null;
    network.controlNodesActive = false;
  }

  // restore overloaded functions
  network._restoreOverloadedFunctions();

  // resume calculation
  network.freezeSimulation = false;

  // reset global variables
  network.blockConnectingEdgeSelection = false;
  network.forceAppendSelection = false;
  
  var toolbar = document.getElementById("network-manipulationDiv");
  var editModeDiv = document.getElementById("network-manipulation-editMode");
  toolbar.style.display="block";
  editModeDiv.style.display="none";

  if (network.editMode == true) {
    while (network.manipulationDiv.hasChildNodes()) {
      network.manipulationDiv.removeChild(network.manipulationDiv.firstChild);
    }
	
	// Edit options Button
    network.manipulationDiv.innerHTML = "" +
      "<span class='network-manipulationUI save' id='network-manipulate-saveMap' title='Save'></span>" +
      "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI load' id='network-manipulate-loadMap' title='Load'></span>" +
	  "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI zoomFit' id='network-manipulate-zoomFit' title='Zoom Fit'></span>" +
	  "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI add' id='network-manipulate-addNode' title='Add Node'></span>" +
	  "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI connect' id='network-manipulate-connectNode' title='Connect Node'></span>";
    
	if (network._getSelectedNodeCount() == 1 && network.triggerFunctions.edit) {
      network.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI edit' id='network-manipulate-editNode' title='Edit Node'></span>";
    }
    else if (network._getSelectedEdgeCount() == 1 && network._getSelectedNodeCount() == 0) {
      network.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI edit' id='network-manipulate-editEdge' title='Edit Edge'></span>";
    }
    if (network._selectionIsEmpty() == false) {
      network.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI delete' id='network-manipulate-delete' title='Delete Node'></span>";
    }

    // bind the icons
	var saveMapButton = document.getElementById("network-manipulate-saveMap");
	saveMapButton.onclick = onSave.bind(this);
	var loadMapButton = document.getElementById("network-manipulate-loadMap");
	loadMapButton.onclick = onLoad.bind(this);
	var zoomFitButton = document.getElementById("network-manipulate-zoomFit");
	zoomFitButton.onclick = onZoomFit.bind(this);
    var addNodeButton = document.getElementById("network-manipulate-addNode");
    addNodeButton.onclick = onAdd.bind(this);
    var addEdgeButton = document.getElementById("network-manipulate-connectNode");
    addEdgeButton.onclick = onConnect.bind(this);
    
	if (network._getSelectedNodeCount() == 1 && network.triggerFunctions.edit) {
      var editButton = document.getElementById("network-manipulate-editNode");
      editButton.onclick = network._editNode.bind(this);
    }
    else if (network._getSelectedEdgeCount() == 1 && network._getSelectedNodeCount() == 0) {
      var editButton = document.getElementById("network-manipulate-editEdge");
      editButton.onclick = network._createEditEdgeToolbar.bind(this);
    }
    if (network._selectionIsEmpty() == false) {
      var deleteButton = document.getElementById("network-manipulate-delete");
      deleteButton.onclick = network._deleteSelected.bind(this);
    }
    var closeDiv = document.getElementById("network-manipulation-closeDiv");
    closeDiv.onclick = network._toggleEditMode.bind(this);

    network.boundFunction = network._createManipulatorBar.bind(this);
    network.on('select', network.boundFunction);

  }
  else {
    network.manipulationDiv.innerHTML = "" +
      "<span class='network-manipulationUI save' id='network-manipulate-saveMap' title='Save'></span>" +
      "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI load' id='network-manipulate-loadMap' title='Load'></span>" +
      "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI zoomFit' id='network-manipulate-zoomFit' title='Zoom Fit'></span>" +
	  "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI edit' id='network-manipulate-editModeButton' title='Edit'></span>";
	
	var saveMapButton = document.getElementById("network-manipulate-saveMap");
	saveMapButton.onclick = onSave.bind(this);
	var loadMapButton = document.getElementById("network-manipulate-loadMap");
	loadMapButton.onclick = onLoad.bind(this);
	var zoomFitButton = document.getElementById("network-manipulate-zoomFit");
	zoomFitButton.onclick = onZoomFit.bind(this);
    var editModeButton = document.getElementById("network-manipulate-editModeButton");
    editModeButton.onclick = network._toggleEditMode.bind(this);
  }
};


/*********************************************************************/
/*                      BUTTON SPECIFIC TOOLBARS                     */
/*********************************************************************/


function onAdd() {
  this._clearManipulatorBar();
  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  this.manipulationDiv.innerHTML = document.getElementById('add-toolbar-template').innerHTML
  /*
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
    "Label: </span><input id='node-label' value='1'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
	"Shape: </span><select id='node-shape'>"+
	"<option value='ellipse'>Ellipse</option>"+
	"<option value='image'>Image</option></select>"+
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
    this.constants.labels['addDescription'] + "</span></span>";
  */

  var shape = document.getElementById('node-shape');
  $(shape).on('click', function () {
	//enable edit mode
	console.log("drop down click")
	if (shape.value == 'image') {
		$('#imageWrap').show()
	}
	else {
		$('#imageWrap').hide()
	}
  });
  
  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // we use the boundFunction so we can reference it when we unbind it from the "select" event.
  this.boundFunction = this._addNode.bind(this);
  this.on('select', this.boundFunction);
};

// Pop up for saving and loading
function popup(url, type) {
	newwindow=window.open(url,type,'height=400,width=400,top=400,left=400');
	if (window.focus) {newwindow.focus()}
	return false;
}

$(window).on('message', function(e) {
	var data = e.originalEvent.data
	if (data.name == 'load') {
		loadMap(data)
	}
	else {
		saveMap(data.id)
	}
})

function onSave() {
  popup('popupbasic.html', 'save');
}

function onLoad() {
  popup('popupbasic.html', 'load');
}

function onZoomFit() {
	network.zoomExtent();	
}

function onEdit(data,callback) {
  network._clearManipulatorBar();
  if (network.boundFunction) {
	network.off('select', this.boundFunction);
  }

  network.manipulationDiv.innerHTML = document.getElementById('add-toolbar-template').innerHTML
  /*
  network.manipulationDiv.innerHTML = "" +
	"<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
	"<div class='network-seperatorLine'></div>" +
	"<span class='network-manipulationUI none' id='network-manipulate-back'>" +
	"<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
	"Label: </span><input id='edit-node-label' value="+data.label+">" +
	"<input type='button' value='save' id='edit-node-button'></button>"+
	"</span>";
	*/
  
  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  var saveButton = document.getElementById("edit-node-button");
  $(saveButton).on('click', function() {
	  var labelInput = document.getElementById('edit-node-label');
	  data.label = labelInput.value;
	  callback(data);
  });
}

function onConnect() {
  // clear the toolbar
  this._clearManipulatorBar();
  this._unselectAll(true);
  this.freezeSimulation = true;

  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  this._unselectAll();
  this.forceAppendSelection = false;
  this.blockConnectingEdgeSelection = true;

  this.manipulationDiv.innerHTML = document.getElementById('connect-toolbar-template').innerHTML
  /*
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
	this.constants.labels['linkDescription'] + "</span></span>";
  */

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // we use the boundFunction so we can reference it when we unbind it from the "select" event.
  this.boundFunction = this._handleConnect.bind(this);
  this.on('select', this.boundFunction);

  // temporarily overload functions
  this.cachedFunctions["_handleTouch"] = this._handleTouch;
  this.cachedFunctions["_handleOnRelease"] = this._handleOnRelease;
  this._handleTouch = this._handleConnect;
  this._handleOnRelease = this._finishConnect;

  // redraw to show the unselect
  this._redraw();
};


/*********************************************************************/
/*                        BUTTION FUNCTONS                           */
/*********************************************************************/


// convenience method to stringify a JSON object
function toJSON (obj) {
  return JSON.stringify(obj, null, 4);
};

// Save map to the server
function saveMap(val) {
  console.log(val)
  // Get the lists of node and edge objects
  var data = {
	nodes: nodes.get({fields: ['id','label','x','y','allowedToMoveX','allowedToMoveY']}),
	edges: edges.get()
  };
  var jsonData = toJSON({
	  name: val,
	  data: data
  });
  
  // Send to server		
  $.ajax({
	type: "POST",
	url: "data/save",
	contentType: "application/json",
	dataType: "json",
	data: jsonData,
	//on success
  });
};


// Load a map from a JSON file
function loadMap(data) {
  // Clear the map (needed if currently working on a map)
  console.log(nodes.get())
  if (nodes.get() != []) {
	var res = confirm("Are you sure you want to delete this map?");
	if (res) {
		clearMap(); 
	}
	else {
		return
	}
  }

  draw(data)
};

function clearMap() {
	
  nodes.clear();
  edges.clear();
};


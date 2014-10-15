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
	  var idInput = document.getElementById('new-node-id');
	  var labelInput = document.getElementById('new-node-label');
	  
	  data.id = idInput.value;
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

  var searchDiv = document.createElement('div');
  searchDiv.className = "searchDiv";
  searchDiv.id = "searchDiv";
  network.containerElement.insertBefore(searchDiv,network.frame);
 
  /*
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
  */

};


/*********************************************************************/
/*                        SEARCH FUNCTIONS                           */
/*********************************************************************/

function loadSearchSystem() {

	/*
	var form = document.createElement('form');
	form.id = "searchForm";

	var input = document.createElement
	  <form id="searchForm" action="" method="">
		<input type="hidden" name="wt" value="json">
		<table>
	    <tr>
		<td>search</td>
		<td><input type="text" id="search-id" name="q" value=""></td>
		<td><button id="submitButton">Submit</button></td>
	    </tr>
	  </table>

	  </form>
	
	  <div id="searchResult"></div>
	  */

}

function displayResults(result) {
	var data = result.response;
	var html = "<ul>"
	console.log(data.docs)
	for(var i = 0; i < data.docs.length; i++) {
		var entry = data.docs[i]
		html += "<li>"+entry.id.substring(10)+"</li>"
	}
	html += "</ul>"
	
	document.getElementById('searchResult').innerHTML = html;
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

  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
    "Name: </span><input id='new-node-id' value='1'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
    "Label: </span><input id='new-node-label' value='1'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
    this.constants.labels['addDescription'] + "</span></span>";

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // we use the boundFunction so we can reference it when we unbind it from the "select" event.
  this.boundFunction = this._addNode.bind(this);
  this.on('select', this.boundFunction);
};

function onSave() {
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
    "<input id='map-id' value='newMap'>" +
    "<input type='button' value='save' id='save-map-button'></button></span>";
	  
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  var saveButton = document.getElementById("save-map-button");
  var idInput = document.getElementById("map-id");
  $(saveButton).on('click', function(){
    saveMap(idInput.value)
  })
  $(saveButton).on('click', function(){
    _createManipulatorBar();
  })
}


function onLoad() {
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
    "<input id='map-id' value='mindMap1'>" +
    "<input type='button' value='load' id='load-map-button'></button></span>";
	  
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  var loadButton = document.getElementById("load-map-button");
  var idInput = document.getElementById("map-id");
  $(loadButton).on('click', function() {
	loadMap(idInput.value, draw)
  })
  $(loadButton).on('click', function() {
	_createManipulatorBar();
  })
}

function onZoomFit() {
	network.zoomExtent();	
}

function onEdit(data,callback) {
  network._clearManipulatorBar();
  if (network.boundFunction) {
	network.off('select', this.boundFunction);
  }

  network.manipulationDiv.innerHTML = "" +
	"<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
	"<div class='network-seperatorLine'></div>" +
	"<span class='network-manipulationUI none' id='network-manipulate-back'>" +
	"<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
	"Name: </span><input id='edit-node-id' value="+data.id+">" +
	"<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
	"Label: </span><input id='edit-node-label' value="+data.label+">" +
	"<input type='button' value='save' id='edit-node-button'></button></span>";

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  var saveButton = document.getElementById("edit-node-button");
  $(saveButton).on('click', function() {
	  var idInput = document.getElementById('edit-node-id');
	  var labelInput = document.getElementById('edit-node-label');
	  
	  data.id = idInput.value;
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

  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + 
	this.constants.labels['linkDescription'] + "</span></span>";

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
	url: "data",
	contentType: "application/json",
	dataType: "json",
	data: jsonData,
	//on success
  });
};


// Load a map from a JSON file
function loadMap(val, callBack) {
  // Clear the map (needed if currently working on a map)
  if (nodes.get() != []) {
	clearMap(); 
  }
  // Send to server		
  $.ajax({
	type: "GET",
	url: "data/" + val,
	contentType: "application/json",
	dataType: "json",
	//on success
	success: function (data) {
		callBack(data);
	}
  });
};

function clearMap() {
  alert("Are you sure you want to delete this map?");
	
  nodes.clear();
  edges.clear();
};


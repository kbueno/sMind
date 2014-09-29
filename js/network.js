var nodes = new vis.DataSet();
var edges = new vis.DataSet();
var network = null;

function draw(data) {
  // create a network
  var container = document.getElementById('mynetwork');

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
	onAdd: function(data,callback) {
	  var span = document.getElementById('operation');
	  var idInput = document.getElementById('node-id');
	  var labelInput = document.getElementById('node-label');
	  var saveButton = document.getElementById('saveEditButton');
	  var cancelButton = document.getElementById('cancelEditButton');
	  var div = document.getElementById('edit-popUp');
	  span.innerHTML = "Add Node";
	  idInput.value = data.id;
	  labelInput.value = data.label;
	  saveButton.onclick = saveData.bind(this,data,callback);
	  cancelButton.onclick = clearPopUp.bind();
	  div.style.display = 'block';
	},
	onEdit: function(data,callback) {
	  var span = document.getElementById('operation');
	  var idInput = document.getElementById('node-id');
	  var labelInput = document.getElementById('node-label');
	  var saveButton = document.getElementById('saveEditButton');
	  var cancelButton = document.getElementById('cancelEditButton');
	  var div = document.getElementById('edit-popUp');
	  span.innerHTML = "Edit Node";
	  idInput.value = data.id;
	  labelInput.value = data.label;
	  saveButton.onclick = saveData.bind(this,data,callback);
	  cancelButton.onclick = clearPopUp.bind();
	  div.style.display = 'block';
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

  function clearPopUp() {
	var saveButton = document.getElementById('saveEditButton');
	var cancelButton = document.getElementById('cancelEditButton');
	saveButton.onclick = null;
	cancelButton.onclick = null;
	var div = document.getElementById('edit-popUp');
	div.style.display = 'none';

  }

  function saveData(data,callback) {
	var idInput = document.getElementById('node-id');
	var labelInput = document.getElementById('node-label');

	data.id = idInput.value;
	data.label = labelInput.value;
	clearPopUp();
	callback(data);

  }
};











/* MAIN TOOLBAR */
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
    var addNodeButton = document.getElementById("network-manipulate-addNode");
    addNodeButton.onclick = addNodeToolbar.bind(this);
    var addEdgeButton = document.getElementById("network-manipulate-connectNode");
    addEdgeButton.onclick = network._createAddEdgeToolbar.bind(network);
    
	if (network._getSelectedNodeCount() == 1 && network.triggerFunctions.edit) {
      var editButton = document.getElementById("network-manipulate-editNode");
      editButton.onclick = network._editNode.bind(network);
    }
    else if (network._getSelectedEdgeCount() == 1 && network._getSelectedNodeCount() == 0) {
      var editButton = document.getElementById("network-manipulate-editEdge");
      editButton.onclick = network._createEditEdgeToolbar.bind(network);
    }
    if (network._selectionIsEmpty() == false) {
      var deleteButton = document.getElementById("network-manipulate-delete");
      deleteButton.onclick = network._deleteSelected.bind(network);
    }
    var closeDiv = document.getElementById("network-manipulation-closeDiv");
    closeDiv.onclick = network._toggleEditMode.bind(network);

    network.boundFunction = network._createManipulatorBar.bind(network);
    network.on('select', network.boundFunction);

  }
  else {
    network.manipulationDiv.innerHTML = "" +
      "<span class='network-manipulationUI save' id='network-manipulate-saveMap' title='Save'></span>" +

      "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI load' id='network-manipulate-loadMap' title='Load'></span>" +

      "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI edit' id='network-manipulate-editModeButton' title='Edit'></span>";
	
	var saveMapButton = document.getElementById("network-manipulate-saveMap");
	saveMapButton.onclick = onSave.bind(this);
	var loadMapButton = document.getElementById("network-manipulate-loadMap");
	loadMapButton.onclick = onLoad.bind(this);
    var editModeButton = document.getElementById("network-manipulate-editModeButton");
    editModeButton.onclick = network._toggleEditMode.bind(network);
  }
};





function addNodeToolbar() {
  // clear the toolbar
  this._clearManipulatorBar();
  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  // create the toolbar contents
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + this.constants.labels['addDescription'] + "</span></span>";

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // we use the boundFunction so we can reference it when we unbind it from the "select" event.
  this.boundFunction = this._addNode.bind(this);
  this.on('select', this.boundFunction);
};

/*
function onAdd(data,callback) {
  this.manipulationDiv.innerHTML = "" +
  "<input id='node-id' value='new value'>" +
  "<input id='node-label' value='new value'>" +
  "<input type='button' value='save' id='saveEditButton'></button>"
	  
  var saveButton = document.getElementById("");
  idInput.value = data.id;
  labelInput.value = data.label;
  saveButton.onclick = saveData.bind(this,data,callback);
}
*/





/* BUTTON FUNCTIONS */

function onSave() {
  var span = document.getElementById('mapOperation');
  var idInput = document.getElementById('map-id');
  var saveButton = document.getElementById('saveMapButton');
  var cancelButton = document.getElementById('cancelMapButton');
  var div = document.getElementById('map-popUp');
  
  span.innerHTML = "Save Map";
  
  $(saveButton).on('click', function(){
    saveMap(idInput.value)
  })
  $(saveButton).on('click', function() {
	clearMapPopUp()
  })

  cancelButton.onclick = clearMapPopUp.bind();
  div.style.display = 'block';

}

function clearMapPopUp() {
  var saveButton = document.getElementById('saveMapButton');
  var cancelButton = document.getElementById('cancelMapButton');
  saveButton.onclick = null;
  cancelButton.onclick = null;
  var div = document.getElementById('map-popUp');
  div.style.display = 'none';
}

// convenience method to stringify a JSON object
function toJSON (obj) {
  return JSON.stringify(obj, null, 4);
};

// Save map to the server
function saveMap(val) {
  console.log(val)
  // Get the lists of node and edge objects
  var data = {
	nodes: nodes.get({fields: ['id','label','x','y']}),
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

function onLoad() {
  var span = document.getElementById('mapOperation');
  var idInput = document.getElementById('map-id');
  var saveButton = document.getElementById('saveMapButton');
  var cancelButton = document.getElementById('cancelMapButton');
  var div = document.getElementById('map-popUp');
  
  span.innerHTML = "Load Map";
  
  $(saveButton).on('click', function() {
	loadMap(idInput.value, draw)
  })
  $(saveButton).on('click', function() {
	clearMapPopUp()
  })

  cancelButton.onclick = clearMapPopUp.bind();
  div.style.display = 'block';
}

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


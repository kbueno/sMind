var nodes = new vis.DataSet();
var edges = new vis.DataSet();
var network = null;

/*
  function draw() {
  // create a network
  var container = document.getElementById('mynetwork');
  var data = {
	nodes: nodes,
	edges: edges
  };
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
	  var saveButton = document.getElementById('saveButton');
	  var cancelButton = document.getElementById('cancelButton');
	  var div = document.getElementById('network-popUp');
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
	  var saveButton = document.getElementById('saveButton');
	  var cancelButton = document.getElementById('cancelButton');
	  var div = document.getElementById('network-popUp');
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
  network = new vis.Network(container, data, options);

  // add event listeners
  network.on('select', function(params) {
	document.getElementById('selection').innerHTML = 'Selection: ' + params.nodes;
  });

  network.on("resize", function(params) {console.log(params.width,params.height)});

};
*/

function onLoad() {
  // create a network
  var container = document.getElementById('mynetwork');
 
  nodes.add([
    {id: 1, label: 'Node 1'},
    {id: 2, label: 'Node 2'},
    {id: 3, label: 'Node 3'},
    {id: 4, label: 'Node 4'},
    {id: 5, label: 'Node 5'}
  ]);
  edges.add([
    {from: 1, to: 2},
    {from: 1, to: 3},
    {from: 2, to: 4},
    {from: 2, to: 5}
  ]);
 
  var data = {
	nodes: nodes,
	edges: edges
  };

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
	}
  }

  network = new vis.Network(container, data, options);

  // Test to save the map
  saveMap();

}

/*
function clearPopUp() {
  var saveButton = document.getElementById('saveButton');
  var cancelButton = document.getElementById('cancelButton');
  saveButton.onclick = null;
  cancelButton.onclick = null;
  var div = document.getElementById('network-popUp');
  div.style.display = 'none';
}

function saveData(data) {
  var idInput = document.getElementById('node-id');
  var labelInput = document.getElementById('node-label');;
  data.id = idInput.value;

  var div = document.getElementById('network-popUp');;
  data.id = idInput.value;

  data.id = idInput.value;
  data.label = labelInput.value;
  clearPopUp();
  saveMap
}
*/







// No Selection Needed
/*
  function addNode() {
  if (network._selectionIsEmpty() && network.editMode == true) {
	var nodeCount = Object.keys(network.nodes).length + 1;
    var positionObject = network._pointerToPositionObject(network.pointerPosition);
    var defaultData = {
	  id:nodeCount,
	  x:positionObject.left,
	  y:positionObject.top,
	  label:nodeCount,
	  allowedToMoveX:true,
	  allowedToMoveY:true
	};
    network.nodesData.add(defaultData);
    network._createManipulatorBar();
    network.moving = true;
    network.start();  
  }
};

// Selection Needed
function deleteNode() {
  if (!network._selectionIsEmpty() && network.editMode == true) {
    if (!network._clusterInSelection()) {
      var selectedNodes = network.getSelectedNodes();
      var selectedEdges = network.getSelectedEdges();
      var data = {nodes: selectedNodes, edges: selectedEdges};
	  network.edgesData.remove(selectedEdges);
	  network.nodesData.remove(selectedNodes);
      network._unselectAll();
      network.moving = true;
      network.start();
     }
    else {
      alert(this.constants.labels["deleteClusterError"]);
    }
  }
};

function editNode() {

};

function connectNode() {

};
*/


// convenience method to stringify a JSON object
function toJSON (obj) {
  return JSON.stringify(obj, null, 4);
};

function saveMap() {
  // Get the lists of node and edge objects
  var data = {
	nodes: nodes.get(),
	edges: edges.get()
  };
  var jsonData = JSON.stringify(data, undefined, 2);
  
  // Send to client		
  $.ajax({
	type: "POST",
	url: "data",
	contentType: "application/json",
	dataType: "json",
	data: jsonData,
	//on success
  });

  
};

function loadMap() {
  // Send to server		
  $.ajax({
	type: "GET",
	url: "data",
	contentType: "application/json",
	dataType: "json",
	//on success
	success: function (data) {
		nodes = data.nodes,
		edges = data.edges
	}
  });


};

function newMap() {
	nodes.clear();
	edges.clear();
};

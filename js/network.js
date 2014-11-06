var nodes = new vis.DataSet()
var edges = new vis.DataSet()
var network = null

function draw(data) {
  // Vis network needs a div element to live in
  var container = document.getElementById('network')

  // Vis network needs an object with nodes and edges keys
  // This will determine if an object is provided or not
  // If not, it will just use the new vis.DataSet() defined above
  if (data == undefined) {
    data = {
	  nodes: nodes,
	  edges: edges
    }
  } else {
	nodes.add(data.nodes),
	edges.add(data.edges)
  }

  // Lastly, vis network takes a optional object for options
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
	  var shapeInput = document.getElementById('nodeShape');
	  var labelInput = document.getElementById('nodeLabel');
	  
	  if (shapeInput.value == 'image') {
		  data.image = document.getElementById('nodeImage').value;
		  // TODO: check if image is valid?
		  // if (data.image...)
	  }

	  data.shape = shapeInput.value;
	  data.label = labelInput.value;
	  console.log(data)
	  callback(data);
	},
	onConnect: function(data, callback) {
	  if (data.from == data.to) {
		var res = confirm("Do you want to connect the node to itself?");
		if (!res) {
			return;
		}
	  }

	  var labelInput = document.getElementById('edgeLabel');
	  var typeInput = document.getElementById('edgeType');
	  
	  data.label = labelInput.value;
	  data.style = typeInput.value;
	  console.log(data);
	  callback(data);
	}
  }

  // Create the network and override the main toolbar function
  network = new vis.Network(container, data, options);
  network._createManipulatorBar = _createManipulatorBar.bind(network)
  network._createManipulatorBar()

  // Add event listeners
  // This just displays selected nodes
  network.on('select', function(params) {
	document.getElementById('selection').innerHTML = 'Selection: ' + params.nodes;
  })
  
  // This opens editNode or editEdge toolbar
  // Will also show a preview in search bar if possible
  network.on('doubleClick', function(params) {
	// need to set tapAlways to false, otherwise
	// edit toolbar will not be created to first time
	// doubleclick is used
	network.hammer.options.tapAlways = false
	if (network._getSelectedNodeCount() == 1) {
	  // TODO: open search result in search bar
	  //var base = "home/kbueno/Code/sMind/libs/solr/Testing/TestDocs/"
	  //window.open("/docs/"+base + params.nodes, "_blank", "toolbar=no, scrollbars=no, resizable=yes, top=500, left=500, width=600, height=600");
	  _editNode.call(network)
	}
    else if (network._getSelectedEdgeCount() == 1 && network._getSelectedNodeCount() == 0) {
	  createEditEdgeToolbar.call(network)
	}	
	
  })

  // This handles the submit button for the search bar
  var submitButtom = document.getElementById('submitButton');
  $(submitButton).on('click', function(e) {
	e.preventDefault();
	var input = $('#searchForm').serialize();
    //appends highlighting parameters to the user-query
	input += "&hl=true&hl.simple.pre=%3Cb%3E&hl.simple.post=%3C%2Fb%3E";
	$.ajax({
	  url: "http://localhost:7777/solr/collection1/select",
	  dataType: "json",
	  data: input,
	  success: function(response) {
		displayResults(response)
	  }
	})
  })

}


/*********************************************************************
                        SEARCH FUNCTIONS                           

The highlight strings are returned in a response as their own dictionary.
You key into this dictionary with the doc.id to get the highlighting object
for that document, then dereference the object with .text to get the highlighted 
text. As to why the highlights are returned separately from the docs, in the
words of Zhe Dang, don't ask me why ... because I have no ******ing clue.
/*********************************************************************/


// Displays the results from a search query
function displayResults(result) {
  var data = result.response
  console.log(data.docs)
  // the hit highlights are a separate object in the response 
  // (separate from the docs object)
  var highlights = result.highlighting;
   
  // Format results in HTML
  var html = ""
  for(var i = 0; i < data.docs.length; i++) {
    var entry = data.docs[i];
    var highlightStr = highlights[entry.id].text;
	var pathToks = entry.id.split("/");
	var formattedDateTime = new Date(entry.lastModified);

	html += "<li><ul><a href=/docs/"+entry.id+">"+pathToks[pathToks.length-1]+"</a></ul></li>"
	html += "<dl pathName='"+entry.id+"'>"
	html += "<dd><b>File:</b> "+pathToks[pathToks.length-1]+"</dd>"
    html += "<dd><b>Author:</b> "+entry.author+"..."+"</dd>"
    html += "<dd><b>Date:</b> "+formattedDateTime.toString()+"</dd>"
	
	// highlighted result strings can sometimes be empty, 
	// in which case we'll instead print the first few lines of that doc
	// print highlight string if not empty
    if(highlightStr !== undefined) { 
      html += "<dd><b>Text:</b> "+highlightStr+"</dd>"
    }
    else{  //else print the first lines of the doc
	  html += "<dd><b>Text:</b> "+entry.text[0].substring(0,120)+"..."+"</dd>"
    }
    
	html += "</dl>"
  }   
  document.getElementById('searchResult').innerHTML = html;

  // Event listener for clicking on entry
  $('#searchResult dl').on('click', function (e) {
    // If not in edit mode, enable
	// Otherwise it will not let you add a node
	if (!network.editMode) {
	  network._toggleEditMode.call(network);
	}
	
	// TODO: whole path
	// Call addNode toolbar and pass the path
	var path = this.getAttribute('pathName');
	console.log(path)
	createAddNodeToolbar.call(network, path);
  })
}


/*********************************************************************/
/*                        MAIN TOOLBAR                               */
/*********************************************************************/


// Main toolbar
_createManipulatorBar = function() {
  // Remove bound functions
  if (network.boundFunction) {
    network.off('select', network.boundFunction);
  }

  if (network.edgeBeingEdited !== undefined) {
    network.edgeBeingEdited._disableControlNodes();
    network.edgeBeingEdited = undefined;
    network.selectedControlNode = null;
    network.controlNodesActive = false;
  }

  // Restore overloaded functions
  network._restoreOverloadedFunctions();

  // Resume calculation
  network.freezeSimulation = false;

  // Reset global variables
  network.blockConnectingEdgeSelection = false;
  network.forceAppendSelection = false;
  
  // On initial load, this displays the correct toolbar? I forget...
  var toolbar = document.getElementById("network-manipulationDiv");
  toolbar.style.display="block";
  var editModeDiv = document.getElementById("network-manipulation-editMode");
  editModeDiv.style.display="none";

  // If in edit mode, create edit modes toolbar
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
    
	if (network._getSelectedNodeCount() == 1) {
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
        "<span class='network-manipulationUI delete' id='network-manipulate-delete' title='Delete'></span>";
    }

    // bind the icons
	var saveMapButton = document.getElementById("network-manipulate-saveMap");
	saveMapButton.onclick = popup.bind(this,'popupbasic.html','save');
	var loadMapButton = document.getElementById("network-manipulate-loadMap");
	loadMapButton.onclick = popup.bind(this,'popupbasic.html','load');
	var zoomFitButton = document.getElementById("network-manipulate-zoomFit");
	zoomFitButton.onclick = onZoomFit.bind(this);
    var addNodeButton = document.getElementById("network-manipulate-addNode");
    addNodeButton.onclick = createAddNodeToolbar.bind(this, undefined);
    var addEdgeButton = document.getElementById("network-manipulate-connectNode");
    addEdgeButton.onclick = createAddEdgeToolbar.bind(this);
    
	if (network._getSelectedNodeCount() == 1) {
      var editButton = document.getElementById("network-manipulate-editNode");
      editButton.onclick = _editNode.bind(this);
    }
    else if (network._getSelectedEdgeCount() == 1 && network._getSelectedNodeCount() == 0) {
      var editButton = document.getElementById("network-manipulate-editEdge");
      editButton.onclick = createEditEdgeToolbar.bind(this);
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
	saveMapButton.onclick = popup.bind(this,'popupbasic.html','save');
	var loadMapButton = document.getElementById("network-manipulate-loadMap");
	loadMapButton.onclick = popup.bind(this,'popupbasic.html','load');
	var zoomFitButton = document.getElementById("network-manipulate-zoomFit");
	zoomFitButton.onclick = onZoomFit.bind(this);
    var editModeButton = document.getElementById("network-manipulate-editModeButton");
    editModeButton.onclick = network._toggleEditMode.bind(this);
  }
};


/*********************************************************************/
/*                      BUTTON SPECIFIC TOOLBARS                     */
/*********************************************************************/


// Create the add toolbar when the 'add node' button is clicked
function createAddNodeToolbar(path) {
  // Clear whatever toolbar was being used in order to create this one
  this._clearManipulatorBar();
  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  // All the HTML for the toolbar goes here
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
    
	"<span class='network-manipulationLabel'>Label: </span>" +
	"<input id='nodeLabel' value=''>" +
    
	"<span class='network-manipulationLabel'>Shape: </span>" +
	"<select id='nodeShape'>"+
	"<option value='ellipse'>Ellipse</option>"+
	"<option value='image'>Image</option>"+
	"<option value='box'>Box</option>"+
	"<option value='database'>Database</option>"+
	"<option value='circle'>Circle</option>"+
	"<option value='dot'>Dot</option></select>"+
	
	"<span id='imageWrap' style='display:none'>" +
	"<span id='imageLabel' class='network-manipulationLabel'>Path: </span>" +
	"<input id='nodeImage' value='css/img/'></span>" +

	"<span class='network-manipulationLabel'>Link: </span>" +
	"<input id='nodeURL' value='http://'>" +

    "<span class='network-manipulationLabel'>" + 
    this.constants.labels['addDescription'] + "</span></span>";

  // If a path was provided, then an image is default selected
  if (path != undefined) {
	//var pathToks = path.split("/");
    //title = pathToks[pathToks.length-1]
		
	document.getElementById('nodeLabel').value = path
	var image = document.getElementById('nodeImage')
	
	// TODO: automate this more?...
	// Determine what kind of image to use
	var types = ['.doc', '.pdf', '.jpeg',]
	if (path.indexOf('.doc') > -1) {
	  image.value = 'css/img/doc.png'
	}
	else if (path.indexOf('.pdf') > -1) {
	  image.value = 'css/img/pdf.png'
	}
	else if (path.indexOf('.jpeg') > -1) {
	  image.value = 'css/img/image.png'
	}
	
	// change the shape drop down accordingly
	var shape = document.getElementById('nodeShape')
	$(shape).val('image').change()
	$('#imageWrap').show()
  }

  // Shape event listener
  var shape = document.getElementById('nodeShape');
  $(shape).on('click', function () {
	// If image shape is selected, show URL input box
	if (shape.value == 'image') {
		$('#imageWrap').show()
	}
	else {
		$('#imageWrap').hide()
	}
  });
  
  // Bind the back button
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // We use the boundFunction so we can reference it when we unbind it from the "select" event.
  this.boundFunction = this._addNode.bind(this);
  this.on('select', this.boundFunction);
};

// Create the edit toolbar when the 'edit node' button is clicked
function onEdit(data, callback) {
  // Clear whatever toolbar was being used in order to create this one
  network._clearManipulatorBar();
  if (network.boundFunction) {
	network.off('select', this.boundFunction);
  }

  // All the HTML for the toolbar goes here
  network.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
    "<span class='network-manipulationLabel'>Label: </span>" +
	"<input id='nodeLabel' value=''>" +
    
	"<span class='network-manipulationLabel'>Shape: </span>" +
	"<select id='nodeShape'>"+
	"<option value='ellipse'>Ellipse</option>"+
	"<option value='image'>Image</option>"+
	"<option value='box'>Box</option>"+
	"<option value='database'>Database</option>"+
	"<option value='circle'>Circle</option>"+
	"<option value='dot'>Dot</option></select>"+
	
	"<span id='imageWrap' style='display:none'>" +
	"<span class='network-manipulationLabel'>URL: </span>" +
	"<input id='nodeImage' value=''></span>" +
	
	"<span class='network-manipulationLabel'>Link: </span>" +
	"<input id='nodeURL' value='http://'>" +

	"<input type='button' value='save' id='edit-node-button'></button>"+
	"</span>";
 
  // Set all the defaults
  document.getElementById('nodeLabel').value = data.label

  var shape = document.getElementById('nodeShape');
  $(shape).val(data.shape).change()
  if (shape.value == 'image') {
	$('#imageWrap').show()
	document.getElementById('nodeImage').value = data.image	
  }

  document.getElementById('nodeURL').value = data.url

  // Shape event listener
  $(shape).on('click', function () {
	// If image shape is selected, show URL input box
	if (shape.value == 'image') {
		$('#imageWrap').show()
	}
	else {
		$('#imageWrap').hide()
	}
  });

  // Bind the back button
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // Bind the save button
  var saveButton = document.getElementById("edit-node-button");
  $(saveButton).on('click', function() {
	var labelInput = document.getElementById('nodeLabel');
	var shapeInput = document.getElementById('nodeShape');
	var imageInput = document.getElementById('nodeImage');
	var linkInput = document.getElementById('nodeURL');

	data.label = labelInput.value;
	data.shape = shapeInput.value;
	data.image = imageInput.value;
	data.url = linkInput.value;
	  
	callback(data);
  });
}

// Create the edit toolbar when the 'edit node' button is clicked
function createAddEdgeToolbar() {
  // Clear whatever toolbar was being used in order to create this one
  this._clearManipulatorBar();
  this._unselectAll(true);
  this.freezeSimulation = true;

  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  this._unselectAll();
  this.forceAppendSelection = false;
  this.blockConnectingEdgeSelection = true;

  // All the HTML for the toolbar goes here
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
	"<span class='network-manipulationLabel'>Label: </span>" +
	"<input id='edgeLabel' value=''>" +
	
	"<span class='network-manipulationLabel'>Type: </span>" +
	"<select id='edgeType'>" +
	"<option value='line'>Line</option>" +
	"<option value='dash-line'>Dash</option>" +
	"<option value='arrow'>Arrow</option>" +
	"<option value='arrow-center'>Arrow2</option>" +
	"</select>" +
    
	"<span class='network-manipulationLabel'>" + 
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

// Create the edit edge toolbar when the 'edit edge' button is clicked
function createEditEdgeToolbar() {
  // clear the toolbar
  this._clearManipulatorBar();
  this.controlNodesActive = true;

  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  // get selected edge
  this.edgeBeingEdited = this._getSelectedEdge();
  this.edgeBeingEdited._enableControlNodes();

  // All the HTML for the toolbar goes here
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
	"<span class='network-manipulationLabel'>Label: </span>" +
	"<input id='edgeLabel' value=''>" +
	
	"<span class='network-manipulationLabel'>Type: </span>" +
	"<select id='edgeType'>" +
	"<option value='line'>Line</option>" +
	"<option value='dash-line'>Dash</option>" +
	"<option value='arrow'>Arrow</option>" +
	"<option value='arrow-center'>Arrow2</option>" +
	"</select>" +
    
	"<input type='button' value='save' id='edit-edge-button'></button>"+
	"<span class='network-manipulationLabel'>" + 
	this.constants.labels['editEdgeDescription'] + "</span></span>";
 
  
  // TODO: FIX THIS
  document.getElementById('edgeLabel').value = this.edgeBeingEdited.label
  
  var type = document.getElementById('edgeType');
  $(type).val(this.edgeBeingEdited.options.style).change()
   
  console.log(this.edgeBeingEdited.id)

  // Bind the save button
  var saveButton = document.getElementById("edit-edge-button");
  $(saveButton).on('click', function() {
	var labelInput = document.getElementById('edgeLabel');
	var typeInput = document.getElementById('edgeType');

	var data = {
	  id: network.edgeBeingEdited.id,
	  label: labelInput.value,
	  style: typeInput.value
	}
	
    network.edgesData.update(data);
    network._createManipulatorBar();
    network.moving = true;
    network.start();
  });

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // temporarily overload functions
  this.cachedFunctions["_handleTouch"]      = this._handleTouch;
  this.cachedFunctions["_handleOnRelease"]  = this._handleOnRelease;
  this.cachedFunctions["_handleTap"]        = this._handleTap;
  this.cachedFunctions["_handleDragStart"]  = this._handleDragStart;
  this.cachedFunctions["_handleOnDrag"]     = this._handleOnDrag;
  this._handleTouch     = this._selectControlNode;
  this._handleTap       = function () {};
  this._handleOnDrag    = this._controlNodeDrag;
  this._handleDragStart = function () {}
  this._handleOnRelease = this._releaseControlNode;

  // redraw to show the unselect
  this._redraw();
};

// TODO: Fix exponential zooming out...
function onZoomFit() {
	network.zoomExtent()
}


/*********************************************************************/
/*                        BUTTION FUNCTONS                           */
/*********************************************************************/


// Override edit function, added attributes to pass back like image, url, etc
_editNode = function() {
    if (this.editMode == true) {
      var node = this._getSelectedNode();
      var data = {
		id:node.id,
        label: node.label,
        group: node.options.group,
        shape: node.options.shape,
		image: node.options.image,
        color: {
          background:node.options.color.background,
          border:node.options.color.border,
          highlight: {
            background:node.options.color.highlight.background,
            border:node.options.color.highlight.border
          }
        }};
      var me = this;
      onEdit(data, function (finalizedData) {
	    me.nodesData.update(finalizedData);
        me._createManipulatorBar();
        me.moving = true;
        me.start();
      });
    }
};

// Creates a pop up for saving and loading
function popup(url, type) {
	newwindow=window.open(url,type,'height=400,width=400,top=400,left=400');
	if (window.focus) {newwindow.focus()}
	return false;
}

// Handles the response from the pop up
// Calls the appropriate functions 
$(window).on('message', function(e) {
	var data = e.originalEvent.data
	if (data.name == 'load') {
		loadMap(data)
	}
	else {
		saveMap(data.id)
	}
})

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


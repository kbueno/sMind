var nodes = new vis.DataSet();
var edges = new vis.DataSet();
var network = null;

function draw(data) {
  // Vis network needs a div element to live in
  var container = document.getElementById('network');

  // Vis network needs an object with nodes and edges keys
  // This will determine if an object is provided or not
  // If not, it will just use the new vis.DataSet() defined above
  console.log(data);
  if (data == undefined) {
    data = {
	  nodes: nodes,
	  edges: edges
    };
  } else {
	nodes.add(data.nodes);
	edges.add(data.edges);
  }

  // Lastly, vis network takes a optional object for options
  var options = {
	keyboard: true,
	stabilize: false,
	// Allows user to move nodes where they please
	physics: {
	  barnesHut: {
		gravitationalConstant:0,
		springConstant:0,
		centralGravity:0
	  }
	},
	// No pushing other nodes away
	smoothCurves: {
	  dynamic:false,
	  type: "continuous"
	},
    // Turns on pre-made toolbar functions
	dataManipulation: true,
	onAdd: function(data, callback) {
	  onAdd(data,callback);
	},
	onConnect: function(data, callback) {
	  onConnect(data,callback);
	}
  };

  // Create the network and override the main toolbar function
  network = new vis.Network(container, data, options);
  network._createManipulatorBar = _createManipulatorBar.bind(network);
  network._createManipulatorBar();

  // Add event listeners
  // This just displays selected nodes
  network.on('select', function(params) {
	document.getElementById('selection').innerHTML = 'Selection: ' + params.nodes;
  });
  
  // This will open the node link if it exists or
  // show the search results in search bar if it exists
  network.on('doubleClick', function(params) {
	// Make sure a node is actually selested
	if (network._getSelectedNodeCount() == 1) {
	  var node = nodes.get(params.nodes[0]);
	  console.log(node);
	  
	  // TODO: open search result in search bar
	  if (node.path != undefined) {
		console.log("there is a doc");
		// search for path
	  }
	  if (node.url != "") {
		window.open(node.url, "_blank", "top=400, left=400, width=600, height=400, menubar=yes, toolbar=yes");
	  }
	}	
  });

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
	  success: function(res) {
		displayResults(res);
	  }
	});
  });

  createPopup();
  $('#filePopup').dialog('close');
};

/*********************************************************************/
/* Collects the data to create a node                                */
/*********************************************************************/
function onAdd(data, callback) {
  var shapeInput = document.getElementById('nodeShape');
  var labelInput = document.getElementById('nodeLabel');
  var linkInput = document.getElementById('nodeURL');
  var path = document.getElementById('nodePath');
  var colorInput = $('#nodeColor').spectrum('get');

  data.color = colorInput.toHexString();
  data.url = linkInput.value;
  data.shape = shapeInput.value;
  data.label = labelInput.value;
	  
  if (path !== null) {
	data.path = path.getAttribute('pathName');
  }
  if (linkInput.value != '' && linkInput.value.indexOf('http://') == -1) {
	// Must have an http:// to open link correctly
	linkInput.value = 'http://' + linkInput.value;
  }

  console.log(data);

  if (shapeInput.value != 'image') {
	callback(data);
  }
  else { // If there is an image to upload, get the image
	var file = document.getElementById('nodeImage').files[0];
	var type = file.type.split("/");
	if (!type[0].match('image')) {
	  $('.ui-dialog-content').append("<p id='alert'>Flie is not an image.</p>");
	  var buttons = { 
	    Ok: function() {
		  clearPopup();
          $('#filePopup').dialog('close');
	    },
	  }
	  $('#filePopup').dialog("option", "buttons", buttons);
	  $('#filePopup').dialog("open");
	  return;
	}

	var form = new FormData();
	form.append('img', file, file.name);

	$.ajax({
      url: '/upload/image',
      type: 'POST',
      data: form,
      cache: false,
      dataType: 'json',
      processData: false,
      contentType: false, 
      success: function(res) {
		data.image = res.imagePath;
		callback(data);
      },
    });	
  }
}

/*********************************************************************/
/* Collects the data to create a link                                */
/*********************************************************************/
function onConnect(data, callback) {
  var labelInput = document.getElementById('edgeLabel');
  var typeInput = document.getElementById('edgeType');
	  
  data.label = labelInput.value;
  data.style = typeInput.value;
	  
  if (data.from == data.to) {
	$('.ui-dialog-content').append("<p id='alert'>Do you want to connect the node to itself?</p>");
    var buttons = { 
      Cancel: function() {
		  clearPopup();
          $('#filePopup').dialog('close');
		  return;
	  },
	  Ok: function() {
	    clearPopup();
        $('#filePopup').dialog('close');
		callback(data)
	  },
	}
	$('#filePopup').dialog("option", "buttons", buttons);
	$('#filePopup').dialog("open");
  }
  else {	  
    callback(data);
  }
}
	
/*********************************************************************/
/* Displays the results from a search query                          */
/*********************************************************************/
function displayResults(result) {
  var data = result.response
  console.log(data)
  // The hit highlights are a separate object in the response 
  // (separate from the docs object)
  var highlights = result.highlighting;
   
  // Format results in HTML
  var html = ""
  for(var i = 0; i < data.docs.length; i++) {
    var entry = data.docs[i];
    var highlightStr = highlights[entry.id].text;
	var pathToks = entry.id.split("/");
	var formattedDateTime = new Date(entry.lastModified);

	html += "<li><a href=/docs/"+entry.id+">"+pathToks[pathToks.length-1]+"</a></li>"
	html += "<dl pathName='"+entry.id+"'>"
	html += "<dd><b>File:</b> "+pathToks[pathToks.length-1]+"</dd>"
    html += "<dd><b>Author:</b> "+entry.author+"..."+"</dd>"
    html += "<dd><b>Date:</b> "+formattedDateTime.toString()+"</dd>"
	
	// highlighted result strings can sometimes be empty,  in which case we'll 
	// instead print the first few lines of that doc print highlight string if not empty
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
	// Call addNode toolbar and pass the path
	var path = this.getAttribute('pathName');
	createAddNodeToolbar.call(network, path);
  })
}


/*********************************************************************/
/*                        MAIN TOOLBAR                               */
/*********************************************************************/
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

 
  // WARNING: Could cause potential css problems?
  network.editMode = true;
  // Edit options Button
  network.manipulationDiv.innerHTML = "" +
      "<span class='network-manipulationUI save' id='network-manipulate-file' title='File'></span>" +
	  
	  "<span id='menuWrap' style='display:none;'>" +
	  "<ul id='fileMenu'>" +
		"<li><span class='save'></span>Save<ul class='menuOption'>" +
			"<li id='saveToDisk'>To Disk</li><input type='file' id='saveFile' style='display:none;'>" +
			"<li id='saveToSmind'>To sMind</li>" +
		"</ul></li>" +
		"<li><span class='load'></span>Load<ul class='menuOption'>" +
			"<li id='loadFromDisk'>From Disk</li><input type='file' id='loadFile' style='display:none;'>" +
			"<li id='loadFromSmind'>From sMind</li>" +
		"</ul></li>" +
	  "</ul>" +
	  "</span>" +

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
	$('#fileMenu').menu();
	var fileButton = document.getElementById("network-manipulate-file");
	fileButton.onclick = function () { 
	  $('#menuWrap').show(); 
	};
	$('#fileMenu').mouseleave(function() { 
		$('#menuWrap').hide() 
	}); 
	
	var saveToDisk = document.getElementById("saveToDisk");
	saveToDisk.onclick = downloadFile.bind(this);
	var saveToSmind = document.getElementById("saveToSmind");
	saveToSmind.onclick = popup.bind(this, "Save");
	var loadFromDisk = document.getElementById("loadFromDisk");
	loadFromDisk.onclick = function () {
      // Call hidden input box	
	  $('#loadFile').trigger('click');
	  return false;
	}
	// TODO: causes problem when selects a second time
    $('#loadFile').change(function () {
		// When file is chosen from disk
		uploadFile();
	});
	var loadFromSmind = document.getElementById("loadFromSmind");
	loadFromSmind.onclick = popup.bind(this, "Load");

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
};



/*********************************************************************/
/* Add Node Toolbar													 */
/*********************************************************************/
function createAddNodeToolbar(path) {
  // Clear whatever toolbar was being used in order to create this one
  network._clearManipulatorBar();
  if (network.boundFunction) {
    network.off('select', network.boundFunction);
  }

  // All the HTML for the toolbar goes here
  network.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
    
	"<span class='network-manipulationLabel'>Label: </span>" +
	"<input id='nodeLabel' value=''>" +
    
	//"<span id='nodeShape'><span>"+
	"<select id='nodeShape'>"+
	"<option value='ellipse'>Ellipse</option>"+
	"<option value='image'>Image</option>"+
	"<option value='box'>Box</option>"+
	"<option value='database'>Database</option>"+
	"<option value='circle'>Circle</option>"+
	"<option value='dot'>Dot</option></select>"+

	"<span id='imageWrap' style='display:none'>" +
	"<input type='file' id='nodeImage'></span>" +

    "<input type='text' id='nodeColor'/>" +
	
	"<span class='network-manipulationLabel'>Group: </span>" +
	"<select id='nodeGroup'>" +
	"<option value='none'>None</option>" +
	"<option value='new'>New</option>" +
	"</select>" +
	
	//"<span id='groupWrap' style='display:none'>" +
	//"<input id='groupLabel' value='1'></span>" +
	
	"<span class='network-manipulationLabel'>Link: </span>" +
	"<input id='nodeURL' value=''>" +

    "<span class='network-manipulationLabel'>" + 
    network.constants.labels['addDescription'] + "</span></span>";


  //TODO!
  // create shape icon dropdown
  /*
  */
  
  // If a path was provided, then an image is default selected
  if (path != undefined) {
	// save the path somewhere
    network.manipulationDiv.innerHTML += "" + "<span id='nodePath' pathName='"+path+"'>";
	var pathToks = path.split("/");
    title = pathToks[pathToks.length-1]
		
	document.getElementById('nodeLabel').value = title
	var image = document.getElementById('nodeImage')
	
	// TODO: change this, or automate this more, or add more...
	// Determine what kind of image to use
	if (title.indexOf('.doc') > -1) {
	  image.value = 'css/img/doc.png'
	}
	else if (title.indexOf('.pdf') > -1) {
	  image.value = 'css/img/pdf.png'
	}
	else if (title.indexOf('.jpeg') > -1) {
	  image.value = 'css/img/image.png'
	}
	
	// change the shape drop down accordingly
	var shape = document.getElementById('nodeShape')
	$(shape).val('image').change()
	$('#imageWrap').show()
  }

  /*
  // Group event listener
  var group = document.getElementById('nodeGroup');
  $(group).on(click, function () {
	if (group.value == 'new') {
	  //new group turns to input box inside <option>
	}
	else if (group.value != 'none') {
	  // set color of group
	}
  });
  */

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

  $("#nodeColor").spectrum({
    color: "#45b5d6",
	preferredFormat: 'hex',
	showInput: true
  });

  // Bind the back button
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = network._createManipulatorBar.bind(this);

  // We use the boundFunction so we can reference it when we unbind it from the "select" event.
  network.boundFunction = network._addNode.bind(this);
  network.on('select', network.boundFunction);
};

/*********************************************************************/
/* Edit Node Toolbar                                                 */
/*********************************************************************/
function createEditNodeToolbar(data, callback) {
  // Clear whatever toolbar was being used in order to create this one
  network._clearManipulatorBar();
  if (network.boundFunction) {
	network.off('select', network.boundFunction);
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
	"<span class='network-manipulationLabel'>ImageURL: </span>" +
	"<input id='nodeImage' value=''></span>" +
	
    "<input type='text' id='nodeColor'/>" +

	"<span class='network-manipulationLabel'>Link: </span>" +
	"<input id='nodeURL' value='http://'>" +

	"<input type='button' value='save' id='edit-node-button'></button>"+
	"</span>";
 
  // Set all the defaults
  document.getElementById('nodeLabel').value = data.label
  document.getElementById('nodeURL').value = data.url

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

  $("#nodeColor").spectrum({
    color: data.color.background,
	preferredFormat: 'hex',
	showInput: true
  });

  // Bind the back button
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = network._createManipulatorBar.bind(this);

  // Bind the save button
  var saveButton = document.getElementById("edit-node-button");
  $(saveButton).on('click', function() {
	var labelInput = document.getElementById('nodeLabel');
	var shapeInput = document.getElementById('nodeShape');
	var imageInput = document.getElementById('nodeImage');
	var linkInput = document.getElementById('nodeURL');
	var colorInput = $('#nodeColor').spectrum('get')
	  
	if (linkInput.value != '' && linkInput.value.indexOf('http://') == -1) {
	  linkInput.value = 'http://' + linkInput.value
	}

	data.color =  colorInput.toHexString();
	data.label = labelInput.value;
	data.shape = shapeInput.value;
	data.image = imageInput.value;
	data.url = linkInput.value;
	  
	callback(data);
  });
}

/*********************************************************************/
/* Add Edge Toolbar                                                  */
/*********************************************************************/
function createAddEdgeToolbar() {
  // Clear whatever toolbar was being used in order to create this one
  network._clearManipulatorBar();
  network._unselectAll(true);
  network.freezeSimulation = true;

  if (network.boundFunction) {
    network.off('select', network.boundFunction);
  }

  network._unselectAll();
  network.forceAppendSelection = false;
  network.blockConnectingEdgeSelection = true;

  // All the HTML for the toolbar goes here
  network.manipulationDiv.innerHTML = "" +
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
	network.constants.labels['linkDescription'] + "</span></span>";

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = network._createManipulatorBar.bind(this);

  // we use the boundFunction so we can reference it when we unbind it from the "select" event.
  network.boundFunction = network._handleConnect.bind(this);
  network.on('select', network.boundFunction);

  // temporarily overload functions
  network.cachedFunctions["_handleTouch"] = network._handleTouch;
  network.cachedFunctions["_handleOnRelease"] = network._handleOnRelease;
  network._handleTouch = network._handleConnect;
  network._handleOnRelease = network._finishConnect;

  // redraw to show the unselect
  network._redraw();
};

/*********************************************************************/
/* Edit Edge Toolbar                                                 */
/*********************************************************************/
function createEditEdgeToolbar() {
  // clear the toolbar
  network._clearManipulatorBar();
  network.controlNodesActive = true;

  if (network.boundFunction) {
    network.off('select', network.boundFunction);
  }

  // get selected edge
  network.edgeBeingEdited = network._getSelectedEdge();
  network.edgeBeingEdited._enableControlNodes();

  // All the HTML for the toolbar goes here
  network.manipulationDiv.innerHTML = "" +
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
	network.constants.labels['editEdgeDescription'] + "</span></span>";
 
  document.getElementById('edgeLabel').value = network.edgeBeingEdited.label
  
  var type = document.getElementById('edgeType');
  $(type).val(network.edgeBeingEdited.options.style).change()
   
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
  backButton.onclick = network._createManipulatorBar.bind(network);

  // temporarily overload functions
  network.cachedFunctions["_handleTouch"]      = network._handleTouch;
  network.cachedFunctions["_handleOnRelease"]  = network._handleOnRelease;
  network.cachedFunctions["_handleTap"]        = network._handleTap;
  network.cachedFunctions["_handleDragStart"]  = network._handleDragStart;
  network.cachedFunctions["_handleOnDrag"]     = network._handleOnDrag;
  network._handleTouch     = network._selectControlNode;
  network._handleTap       = function () {};
  network._handleOnDrag    = network._controlNodeDrag;
  network._handleDragStart = function () {}
  network._handleOnRelease = network._releaseControlNode;

  // redraw to show the unselect
  network._redraw();
};

/*********************************************************************/
/* ZoomFit Button                                                    */
/*********************************************************************/
function onZoomFit() {
	network.zoomExtent(true)
}

/*********************************************************************/
/* Override edit function, added attributes to pass back like image, */ 
/* url, etc                                                          */
/*********************************************************************/
_editNode = function() {
    if (this.editMode == true) {
      var node = this._getSelectedNode();
	  var custom = this.nodesData.get(node.id);
      var data = {
		url: custom.url,
		path: custom.path,
		id: node.id,
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
          },
        }};
      var me = this;
      createEditNodeToolbar(data, function (finalizedData) {
	    me.nodesData.update(finalizedData);
        me._createManipulatorBar();
        me.moving = true;
        me.start();
      });
    }
};

/*********************************************************************/
/* Creates a popup dialog
/*********************************************************************/
function createPopup() {
  $('#filePopup').dialog({
	minWidth: 350,
	minHeight: 150,
    height: 200,
    modal: true,
	buttons: { 
	  Ok: function() {
	    $(this).dialog("destroy");
	  }
	},
  });
}

function clearPopup() {
  $('#mapTable').empty();
  $('#mapID').remove();
  $('#alert').remove();
}

/*********************************************************************/
/* Opens a popup for saving and loading                              */
/*********************************************************************/
function popup(type) {
  $.ajax({
    type: "GET",
	url: "/data",
	contentType: "application/json",
	dataType: "json",
	success: function (data) {
      // Add an input box
	  $('.ui-dialog-buttonpane').prepend("<input type='text' id='mapID' style='margin-top:10px;'>");
	  
      var buttons = [{
	    text: "Cancel",
	    click: function() {
		  clearPopup();
	      $('#filePopup').dialog("close");
	    }
      },
      {
        text: type,
        click: function() {
	      var input = document.getElementById("mapID").value;
	      if (type == "Save") {
		    saveMap(input, data);
	      }
	      else {
		    loadMap(input, data);
	      }
	    }
      }];
      $('#filePopup').dialog("option", "buttons", buttons);
	  $('#filePopup').dialog("option", "title", "sMind Map: " + type);
      $('#filePopup').dialog("open");

	  displayMaps(data);
	}
  });
}

/*********************************************************************/
/* Display table of map names                                        */
/*********************************************************************/
function displayMaps(data) {
  var entry = Object.keys(data)

  var html = "";
  for (var i = 0; i < entry.length; i++) {
	html += "<tr><td data-entryID='"+entry[i]+"'>" +entry[i]+"</td></tr>"
  }
  document.getElementById('mapTable').innerHTML = html;	
			
  $('#mapTable tr').click( function(e) {
	var name = e.target.getAttribute('data-entryID');
	document.getElementById('mapID').value = name;
	
	$(this).siblings().removeClass("selected");
	$(this).toggleClass("selected");
  });				
}

/*********************************************************************/
/* convenience method to stringify a JSON object                     */
/*********************************************************************/
function toJSON (obj) {
  return JSON.stringify(obj, null, 4);
};

/*********************************************************************/
/* Save map to the server                                            */
/*********************************************************************/
function saveMap(id, data) { 
  //var fields =  ['id','label','x','y','allowedToMoveX','allowedToMoveY']
  console.log(nodes.get())
  // Get the lists of node and edge objects
  var rawData = {
    nodes: nodes.get(),
    edges: edges.get()
  };
  var jsonData = toJSON({
    name: id,
	data: rawData
  });
  console.log(jsonData)
  
  // If id already exists, alert to overwrite		
  if (data[id] !== undefined) {
	// Replace current popup
	clearPopup();
	$('.ui-dialog-content').append("<p id='alert'>Are you sure you want to overwrite this map?</p>");
	var buttons = { 
	  Cancel: function() {
		clearPopup();
		popup("Save");
	  },
	  Okay: function() {		  
		// Send to server		
		$.ajax({
		  type: "POST",
		  url: "/data/save",
		  contentType: "application/json",
		  dataType: "json",
		  data: jsonData,
		  success: function () {
			clearPopup();
		    $('#filePopup').dialog("close");
		  }
		});
	  }
	};
    $('#filePopup').dialog("option", "buttons", buttons);
  }
  else {
    // Send to server		
	$.ajax({
	  type: "POST",
	  url: "/data/save",
	  contentType: "application/json",
	  dataType: "json",
	  data: jsonData,
	  success: function () {
		clearPopup();
	    $('#filePopup').dialog("close");
	  }
	});
  }
}

/*********************************************************************/
/* Load a map from a JSON file                                       */
/*********************************************************************/
function loadMap(id, data) {
  // If map does not exist
  if (data[id] == undefined) {
	// Replace the current popup
	clearPopup();
	$('.ui-dialog-content').append("<p id='alert'>Map does not exist!</p>");
	var buttons = { 
	  Ok: function() {
		clearPopup();
		popup("Load");
	  },
	}
	$('#filePopup').dialog("option", "buttons", buttons);
  }
  else {
	// If map not empty, ask to clear map
    if (nodes.get().length != 0) { 
	  // Replace the popup content
	  clearPopup();
	  $('.ui-dialog-content').append("<p id='alert'>Are you sure you want to load without saving this map?</p>");
	  var buttons = { 
	    Cancel: function() {
		  clearPopup();
		  popup("Load");
	    },
	    Okay: function() {		  
		  nodes.clear();
		  edges.clear();
		  clearPopup();
		  $('#filePopup').dialog('destroy');
		  draw(data[id]);
	    },
	  };
      $('#filePopup').dialog("option", "buttons", buttons);
    }
    else {
	  clearPopup();
	  $('#filePopup').dialog('destroy');
	  draw(data[id]);
    }
  }
}

/*********************************************************************/
/* Download a file from disk   										 */
/*********************************************************************/
function downloadFile () {
  // Get the lists of node and edge objects
  var data = {
	nodes: nodes.get({fields: ['id','label','x','y','allowedToMoveX','allowedToMoveY']}),
	edges: edges.get()
  };
  var jsonData = toJSON({
	data: data
  });
  
  // Send to server		
  $.ajax({
	type: "POST",
	url: "/download/file",
	contentType: "application/json",
	dataType: "json",
	data: jsonData,
	success: function (res) {
	  var frame = document.getElementById("downloadFrame")
	  frame.src = "download/file/"+res.id;
    }
  });
}

/*********************************************************************/
/* Upload a file from disk   										 */
/*********************************************************************/
function uploadFile () {
  var file = document.getElementById('loadFile').files[0]

  var form = new FormData();
  form.append('map', file, file.name)

  // If map not empty, ask to clear map
  if (nodes.get().length != 0) { 
    $('.ui-dialog-content').append("<p id='alert'>Are you sure you want to load without saving this map?</p>");
    var buttons = { 
      Cancel: function() {
		clearPopup();
	    $('#filePopup').dialog('close');
      },
      Okay: function() {		  
	    nodes.clear();
	    edges.clear();
		clearPopup();

		$.ajax({
		  url: '/upload/file',
		  type: 'POST',
		  data: form,
		  cache: false,
		  dataType: 'json',
		  processData: false,
		  contentType: false, 
		  success: function(data) {
	        $('#filePopup').dialog('destroy');
		    draw(data);
		  },
		  // TODO: error?
		});	
      },
    };
    $('#filePopup').dialog("option", "buttons", buttons);
    $('#filePopup').dialog("open");
  }
  else {
    $.ajax({
      url: '/upload/file',
      type: 'POST',
      data: form,
      cache: false,
      dataType: 'json',
      processData: false,
      contentType: false, 
      success: function(data) {
	    draw(data);
      },
    });
  }
}


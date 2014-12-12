var nodes = null;
var edges = null;
var network = null;

function draw(data) {
  // Vis network needs a div element to live in
  var container = document.getElementById('network');

  // Vis network needs an object with nodes and edges keys
  // This will determine if an object is provided or not
  // If not, it will just use the new vis.DataSet()
  console.log(data);
  if (data == undefined) {
	nodes = new vis.DataSet();
	edges = new vis.DataSet();
  } else {
	nodes.add(data.nodes);
	edges.add(data.edges);
  }
  data = {
    nodes: nodes,
    edges: edges
  };

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
	selectable: true,
	tooltip: {
	  delay: 1000,
      fontColor: "Black",
      fontSize: 12, // px
      fontFace: "verdana",
      color: {
        border: "#666",
        background: "#d6d9d8"
	  }
	},
	brokenImage: "css/img/broken.png",
  };

  // Create the network and override the main toolbar function
  network = new vis.Network(container, data, options);
  network._createManipulatorBar = _createManipulatorBar.bind(network);
  network._createManipulatorBar();

  // Add event listeners
  // This will store positions when moved after initial creation
  network.on('stabilized', function () {
	network.storePosition();
  });
  // This will open the node link if it exists or the node document if it exists
  network.on('doubleClick', function(params) {
	// Make sure a node is actually selested
	if (network._getSelectedNodeCount() == 1) {
	  var node = nodes.get(params.nodes[0]);
	  console.log(node);
	  
	  if (node.path != "") {
		console.log("OPEN PATH");
	    window.open("/docs/"+node.path, "_blank", "top=400, left=400, width=600, height=400, menubar=yes, toolbar=yes");
	  }
	  if (node.link != "") {
		// Must have an http:// to open link correctly
        if (node.link.indexOf('http://') == -1) {
	      node.link = 'http://' + node.link;
        }
	    console.log("OPEN LINK");
		window.open(node.link, "_blank", "top=500, left=400, width=600, height=400, menubar=yes, toolbar=yes");
	  }
	}	
  });

  // This handles the submit button for the search bar
  $('#searchButton').on('click', function(e) {
	searchQuery(e);
  });

  createPopup();
  $('#filePopup').dialog('close');
};

/*********************************************************************/
/* Sets up a query string based on search fields                     */
/*********************************************************************/
function searchQuery(e) {
  e.preventDefault();
  var input = $('#searchForm').serialize();
  var fieldStr = "";
  var s = "";

  //get rid of "&from=&to=" junk after call to serialize
  if(input.indexOf("&from") > -1){
    input = input.substring(0,input.indexOf("&from"));
  }
  if(input.indexOf("&to") > -1){
    input = input.substring(0,input.indexOf("&to"));
  }

  //query all, if the user passes nothing/empty-string (queryprefix with no other parameters)
  var queryPrefix = "wt=json&q=";
  if(input == queryPrefix){
    input += "*";  // query = *:*
  }

  //an advanced user may enter a raw query in the search bar, so catch that here 
  //and pass their input directly. The user is on their own making sure the query 
  //is valid, else we'll just not return anything. Test this by entering 
  //'select?q=' before your query in the search bar. Example: 'select?q=text:Client'
  
  //check if query starts with 'select?q='
  var selectStr = "select%3Fq%3D";
  if(input.lastIndexOf(selectStr) != -1 || input.lastIndexOf("select?q=") != -1) {
    // 'select?q=' is just an anchor for signaling a manual search. 
	// all we need is to get the query substring from the input and pass it directly
    var endQueryIndex = input.lastIndexOf(selectStr);
    var queryParams = input.slice(endQueryIndex+selectStr.length,input.length);
    query = queryPrefix + queryParams;
    console.log("manual query: "+input+" end q index="+endQueryIndex);
  }
  else{
    //get the actual query, minus the default prefix
    var query = input.slice(queryPrefix.length,input.length);
    
	var titleCheckBox = document.getElementById('title');
    var authorCheckBox = document.getElementById('author');
    var textCheckBox = document.getElementById('text');
    var dateBegin = document.getElementById('searchRangeFrom').value;
    var dateEnd = document.getElementById('searchRangeTo').value;

    //build list of parameters, each appended with the query terms given by the user.
    //Example: (title and author checked, user enters "Salinger"):  
	//'q=title:Salinger OR author:Salinger'
    var paramList = [];
    //if no fields are checked, query the text field by default
    if(!titleCheckBox.checked && !authorCheckBox.checked && !textCheckBox.checked){
      paramList[paramList.length] = "text:"+query; 
    }
    if(titleCheckBox.checked){
      paramList[paramList.length] = "title:"+query;
    }
    if(authorCheckBox.checked){
      paramList[paramList.length] = "author:"+query;
    }
    if(textCheckBox.checked){
      paramList[paramList.length] = "text:"+query;
    }

    //now construct a complete query string of OR'ed parameters from the list
    for(var i = 0; i < paramList.length; i++){
      if(i == 0){
        query = paramList[i];        
      }
      else{  //subsequent terms after the first one need to be prefixed with 'OR'
        query += " OR " + paramList[i];
      }
    }
    query = queryPrefix + query;
    console.log("constructed query, with params: "+query);

    
    // !! filter queries are appended to the rest of the complete query, 
	// so only do this AFTER query is fully constructed
    /*
      Search by date range. User can enter a begin and end date, or only a begin date 
	  and we'll search from begin to NOW. Pre-condition: expect date parameters are 
	  validated internally by the date-class, and formatted in ISO: yyyy-mm-dd.
      Pad numeric values with zeroes: '1999-01-01' is valid, but '1999-1-1' is not. 
	  Finally, append the suffix "T00:00:00.000Z" to the string; this is required for 
	  a given date-range query. Some sources say you can send wildcards in date-range 
	  queries, such as lastModified:[2010* TO 2014*] but this isn't true. We have to 
	  send full date strings, like this: 
	  lastModified:[2010-01-01T00:00:00.000Z TO 2014-01-01T00:00:00.000Z"]
    */
    console.log("date range params: begin="+dateBegin.toString()+" end="+dateEnd.toString());
    if(dateBegin != undefined && dateBegin != null && dateBegin !== "") {
      var dateSuffix = "T00:00:00.000Z";
      //now end date, so search from begin parameter to NOW
      if(dateEnd == undefined || dateEnd == null || dateEnd == ""){
        query += "&fq=lastModified:["+dateBegin+dateSuffix+" TO NOW]"; 
      }
      else {
        query += "&fq=lastModified:["+dateBegin+dateSuffix+" TO "+dateEnd+dateSuffix+"]";
      }
    }
  }

  //error check: query strings cannot contain wildcard 
  //* if we want highlighted terms, since every term will match *!
  //This error is usually indicated by solr throwing a TooManyClauses 
  //error on the server side.
  if(textCheckBox.checked && (query.indexOf("%2A") == -1 && query.indexOf("*") == -1)) {
    //finally, append highlighting parameters to the user-query. 
	//This must be done even for manual-user queries, since our displayResults
    //function expects highlighting.
    query += "&hl=true&hl.simple.pre=%3Cb%3E&hl.simple.post=%3C%2Fb%3E";
  }

  query += "&fl=title,author,text,lastModified,id";
  console.log("passing query: "+query);
	$.ajax({
	  url: "http://localhost:7777/solr/collection1/select",
	  dataType: "json",
	  data: query,
	  success: function(response) {
		displayResults(response);
	  }
	})
}

/*********************************************************************/
/*  Displays the results from a search query                         */
/*********************************************************************/
function displayResults(result) {
  console.log(result);
  var data = result.response
  
  if (result.highlighting !== undefined) {
	var highlights = result.highlighting
  }
   
  // Format results in HTML
  var html = "";

  //state results found
  if(data.docs.length == 0) {
    html += "<i>No results found</i>";
  }
  else if(data.docs.length == 1){
    html += "<i>1 result</i>";
  }
  else {
    html += "<i>"+data.docs.length.toString()+" results</i>";
  }

  // format the fields in the result
  for(var i = 0; i < data.docs.length; i++){
    var entry = data.docs[i];
	var pathToks = entry.id.split("/");
	var formattedDateTime = new Date(entry.lastModified);

    if(highlights !== undefined && highlights[entry.id] != null){
      var highlightStr = highlights[entry.id].text;
    }

	html += "<li><a href=/docs/"+entry.id+" class='searchLink' target='_blank'>"+pathToks[pathToks.length-1]+"</a></li>"
	html += "<dl pathName='"+entry.id+"'>"

    if(entry.title != undefined) {
      if(entry.title.length < 30) {
        html += "<dd><b>Title:</b> "+entry.title+"</dd>";
      }
      else {
        html += "<dd><b>Title:</b> "+entry.title.substring(0,30)+"...</dd>";
      }
    }
    else {
      html += "<dd><b>Title:</b> <i>not found</i></dd>";
    }

	//html += "<dd><b>File:</b> "+pathToks[pathToks.length-1]+"</dd>"
    
	if(entry.author != undefined) {
      if(entry.author.length < 30) {
        html += "<dd><b>Author:</b> "+entry.author+"</dd>";
      }
      else {
        html += "<dd><b>Author:</b> "+entry.author.substring(0,30)+"...</dd>";
      }
    }
    else {
      html += "<dd><b>Author:</b> <i>not found</i></dd>";
    }
    //now format the date string more simply
    if(formattedDateTime.toString().search("GMT") != -1){
      var chop = formattedDateTime.toString().search("GMT") - 1;
      html += "<dd><b>Date:</b> "+formattedDateTime.toString().substring(0,chop)+"</dd>";
    }
    else {
      html += "<dd><b>Date:</b> "+formattedDateTime.toString()+"</dd>";
	}

	// highlighted result strings can sometimes be empty,  in which case we'll 
	// instead print the first few lines of that doc print highlight string if not empty
    if(highlightStr != undefined) {
      html += "<dd><b>Text:</b> "+highlightStr+"</dd>";
    }
    else {  //else print the first lines of the doc
      html += "<dd><b>Text:</b> "+entry.text[0].substring(0,120)+"..."+"</dd>";
    }
	html += "</dl>";
  }
  document.getElementById('searchResult').innerHTML = html;

  // Event listener for clicking on entry
  $('#searchResult dl').on('click', function (e) {
	// Call addNode toolbar and pass the path
	var path = this.getAttribute('pathName');
	createAddNodeToolbar.call(network, path);
  });

  $('.searchLink').on('click', function(e) {
	console.log(e.target.href)
	e.preventDefault()
	window.open(e.target.href, "_blank", "top=400, left=400, width=600, height=400, menubar=yes, toolbar=yes");
  });

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
  // clear any selections
  network.redraw()

  // Restore overloaded functions
  network._restoreOverloadedFunctions();

  // Resume calculation
  network.freezeSimulation = false;

  // Reset global variables
  network.blockConnectingEdgeSelection = false;
  network.forceAppendSelection = false;
  
  // On initial load, this displays the correct toolbar
  var toolbar = document.getElementById("network-manipulationDiv");
  toolbar.style.display="block";
  var editModeDiv = document.getElementById("network-manipulation-editMode");
  editModeDiv.style.display="none";

 
  // WARNING: Could cause potential css problems?
  network.editMode = true;
  // Edit options Button
  network.manipulationDiv.innerHTML = "" +
      "<span class='network-manipulationUI file' id='networkFile' title='File'></span>" +
	  
	  "<span id='menuWrap' style='display:none;'>" +
	  "<ul id='fileMenu'>" +
		"<li>Save Map<ul class='fileMenuOption'>" +
			"<li id='saveToDisk'>To Disk</li><input type='file' id='saveFile' style='display:none;'>" +
			"<li id='saveToSmind'>To sMind</li>" +
		"</ul></li>" +
		"<li>Load Map<ul class='fileMenuOption'>" +
			"<li id='loadFromDisk'>From Disk</li><input type='file' id='loadFile' style='display:none;'>" +
			"<li id='loadFromSmind'>From sMind</li>" +
		"</ul></li>" +
		"<li id='clearMap'>Clear Map</li>" +
		"<li id='deleteMap'>Delete Map</li>" +
	  "</ul>" +
	  "</span>" +

	  "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI zoomFit' id='networkZoomFit' title='Zoom Fit'></span>" +
	  "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI add' id='networkAddNode' title='Add Node'></span>" +
	  "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI connect' id='networkConnectNode' title='Connect Node'></span>";
   
	/*
	if (network._getSelectedNodeCount() > 1) {
      network.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI group' id='networkGroupNodes' title='Group Nodes'></span>";
    }
	*/
	if (network._getSelectedNodeCount() == 1) {
      network.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI edit' id='networkEditNode' title='Edit Node'></span>";
    }
    else if (network._getSelectedEdgeCount() == 1 && network._getSelectedNodeCount() == 0) {
      network.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI edit' id='networkEditEdge' title='Edit Edge'></span>";
    }
    if (network._selectionIsEmpty() == false) {
      network.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI delete' id='networkDelete' title='Delete'></span>";
    }

    // bind the icons
	$('#fileMenu').menu();
	var fileButton = document.getElementById("networkFile");
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
	// sometimes causes problem when selects a second time...
    $('#loadFile').change(function () {
		// When file is chosen from disk
		uploadFile();
	});
	var loadFromSmind = document.getElementById("loadFromSmind");
	loadFromSmind.onclick = popup.bind(this, "Load");
	var clearMap = document.getElementById("clearMap");
	clearMap.onclick = function () {
      $('.ui-dialog-content').append("<p id='alert'>Are you sure you want to clear this map?</p>");
      var buttons = { 
        Cancel: function() {
		  clearPopup();
	      $('#filePopup').dialog('close');
        },
        Okay: function() {		  
		  nodes.clear();
		  edges.clear();
		  clearPopup();
		  network.redraw();
		  $('#menuWrap').hide() 
	      $('#filePopup').dialog('close');
		},
	  };	
      $('#filePopup').dialog("option", "buttons", buttons);
      $('#filePopup').dialog("open");
	}
	var deleteMap = document.getElementById("deleteMap");
	deleteMap.onclick = popup.bind(this, "Delete");

	var zoomFitButton = document.getElementById("networkZoomFit");
	zoomFitButton.onclick = onZoomFit.bind(this);
    var addNodeButton = document.getElementById("networkAddNode");
    addNodeButton.onclick = createAddNodeToolbar.bind(this, undefined);
    var addEdgeButton = document.getElementById("networkConnectNode");
    addEdgeButton.onclick = createAddEdgeToolbar.bind(this);
    
	/*
	if (network._getSelectedNodeCount() > 1) {
      var groupButton = document.getElementById("networkGroupNodes");
      groupButton.onclick = createGroupNodesToolbar.bind(this);
    } */
	if (network._getSelectedNodeCount() == 1) {
      var editButton = document.getElementById("networkEditNode");
      editButton.onclick = editNode.bind(this);
    }
    else if (network._getSelectedEdgeCount() == 1 && network._getSelectedNodeCount() == 0) {
      var editButton = document.getElementById("networkEditEdge");
      editButton.onclick = createEditEdgeToolbar.bind(this);
    }
    if (network._selectionIsEmpty() == false) {
      var deleteButton = document.getElementById("networkDelete");
      deleteButton.onclick = network._deleteSelected.bind(this);
    }

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
    "<span class='network-manipulationUI back' id='networkBack' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
    
	"<input type='button' value='Label' id='label'>" +
	"<input id='nodeLabel' class='inputLength' value='' style='display:none'>" +
    
	"<input type='button' value='Link' id='link' class='toolbarSpacing'>" +
	"<input id='nodeURL' class='inputLength' value='' style='display:none'>" +
	
	"<select id='nodeShape' class='toolbarSpacing'>"+
	"<option value='ellipse'>Ellipse</option>"+
	"<option value='image'>Other</option>"+
	"<option value='box'>Box</option>"+
	"<option value='database'>Database</option>"+
	"<option value='circle'>Circle</option>"+
	"<option value='dot'>Dot</option></select>"+
	/*
	"<option value='image-doc'>Document</option>"+
	"<option value='image-img'>Image</option>"+
	"<option value='image-pdf'>PDF</option></select>"+
	*/
	
	"<input type='file' id='loadImage' style='display:none'>" +
	"<input readonly id='nodeImage' value='' style='display:none' class='inputLength'>" +

    "<input type='text' id='nodeColor'/>" +

    "<span class='network-manipulationLabel'>" + 
    network.constants.labels['addDescription'] + "</span></span>";

  // If a path was provided, then an image is default selected
  if (path != undefined) {
	// save the path somewhere
    network.manipulationDiv.innerHTML += "" + "<span id='nodePath' pathName='"+path+"'>";
	var pathToks = path.split("/");
    var title = pathToks[pathToks.length-1]
		
	document.getElementById('nodeLabel').value = title
	$('#nodeLabel').toggle();

	/* TODO: if icon dropdown works, add images for types of files
	var image = document.getElementById('nodeImage')
	var titleToks = title.split(".");
	var type = titleToks[titleToks.length-1];
	// Determine what kind of image to use
	if (type == "doc") {
	  $('#nodeShape').val('doc').change()
	}
	else if (type == 'pdf') {
	  $('#nodeShape').val('pdf').change()
	}
	else if (type == 'jpeg') {
	  $('#nodeShape').val('img').change()
	}
	else {
	  $('#nodeShape').val('image').change()
	  $('#nodeImage').show();
	}
  */
  }
  
  // Toggle to only show one option at a time to avoid overflow
  var shown = true;
  $('#label').on('click', function() {
	$('#nodeLabel').toggle();
	if ( $('#nodeURL').toggle( shown ) ) {
		$('#nodeURL').toggle();
	}
  });
  
  $('#link').on('click', function() {
	$('#nodeURL').toggle();
	if ( $('#nodeLabel').toggle( shown ) ) {
		$('#nodeLabel').toggle();
	}
  });
  
  $('#nodeImage').on('click', function() {
    // Call hidden input box	
	$('#loadImage').trigger('click');
	return false;
  });

  $('#loadImage').change(function () {
    // When file is chosen from disk
	var file = document.getElementById('loadImage').files[0];
	document.getElementById('nodeImage').value = file.name;
  });

  // Shape event listener
  var shape = document.getElementById('nodeShape');
  $(shape).on('click', function () {
	// If image shape is selected, show URL input box
	if (shape.value == 'image') {
		$('#nodeImage').show();
	}
	else {
		$('#nodeImage').val('')
		$('#nodeImage').hide();
	}
  });

  $("#nodeColor").spectrum({
    color: "#45b5d6",
	preferredFormat: 'hex',
	showInput: true
  });

  // Bind the back button
  var backButton = document.getElementById("networkBack");
  backButton.onclick = network._createManipulatorBar.bind(this);

  // We use the boundFunction so we can reference it when we unbind it from the "select" event.
  network.boundFunction = addNode.bind(this);
  network.on('select', network.boundFunction);
};

/*********************************************************************/
/* Sets the default data to add to the node                          */
/*********************************************************************/
function addNode() {
  if (network._selectionIsEmpty()) {
    var positionObject = network._pointerToPositionObject(network.pointerPosition);
    var defaultData = {id:randomUUID(),x:positionObject.left,y:positionObject.top,allowedToMoveX:true,allowedToMoveY:true};
    onAdd(defaultData, function(finalizedData) {
      network.nodesData.add(finalizedData);
      network._createManipulatorBar();
      network.moving = true;
      network.start();
    });
  }
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
  var imageInput = document.getElementById('nodeImage');

  data.color = colorInput.toHexString();
  data.link = linkInput.value;
  data.shape = shapeInput.value;
  data.label = labelInput.value;
	  
  if (data.path == null) {
	console.log("NO PATH");
	if (path !== null) {
		data.path = path.getAttribute('pathName');
	}
	else {
		data.path = "";
	}
  }

  var title = "<table>" +
			  "<tr><td><b>Node ID:</b></td><td>"+data.id+"</td>" +
			  "<tr><td><b>Node Label:</b></td><td>"+data.label+"</td>" +
			  "<tr><td><b>Node Link:</b></td><td>"+data.link+"</td>" +
			  "<tr><td><b>Node Shape:</b></td><td>"+data.shape+"</td>" +
			  "<tr><td><b>Node Color:</b></td><td>"+data.color+"</td>" +
			  "<tr><td><b>Node Path:</b></td><td>"+data.path+"</td>" +
			  "</table>";
  data.title = title;
  console.log(data);

  if (shapeInput.value != 'image') {
	callback(data);
  }
  else { // If there is an image to upload, get the image
	var file = document.getElementById('loadImage').files[0];

	// if no image selected
	if (imageInput.value == "") {
	  $('.ui-dialog-content').append("<p id='alert'>No file has been selected.</p>");
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
    // if a data image is selected, but hasn't been changed
	else if (file === undefined && imageInput.value !== "") {
	  callback(data);
	}
    else {	
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
}

/*********************************************************************/
/* Override edit function, added attributes to pass back like image, */ 
/* url, etc                                                          */
/*********************************************************************/
function editNode() {
    if (this.editMode == true) {
      var node = this._getSelectedNode();
	  var custom = this.nodesData.get(node.id);
      var data = {
		link: custom.link,
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
      createEditNodeToolbar(data);
    }
};

/*********************************************************************/
/* Edit Node Toolbar                                                 */
/*********************************************************************/
function createEditNodeToolbar(data) {
  // Clear whatever toolbar was being used in order to create this one
  network._clearManipulatorBar();
  if (network.boundFunction) {
	network.off('select', network.boundFunction);
  }

  // All the HTML for the toolbar goes here
  network.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='networkBack' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
    
	"<input type='button' value='Label' id='label'>" +
	"<input id='nodeLabel' class='inputLength' value='' style='display:none'>" +
    
	"<input type='button' value='Link' id='link' class='toolbarSpacing'>" +
	"<input id='nodeURL' class='inputLength' value='' style='display:none'>" +
	
	"<select id='nodeShape' class='toolbarSpacing'>"+
	"<option value='ellipse'>Ellipse</option>"+
	"<option value='image'>Image</option>"+
	"<option value='box'>Box</option>"+
	"<option value='database'>Database</option>"+
	"<option value='circle'>Circle</option>"+
	"<option value='dot'>Dot</option></select>"+

	"<input type='file' id='loadImage' style='display:none'>" +
	"<input readonly id='nodeImage' value='' style='display:none' class='inputLength'>" +

    "<input type='text' id='nodeColor'/>" +
	
	"<input type='button' value='save' id='editNodeButton' class='toolbarSpacing'></button>"+
	"</span>";
 
  // Set all the defaults
  document.getElementById('nodeLabel').value = data.label;
  document.getElementById('nodeURL').value = data.link;

  var shape = document.getElementById('nodeShape');
  $(shape).val(data.shape).change();
  if (shape.value == 'image') {
	$('#nodeImage').show();
	var fileName = data.image.split("/");
	document.getElementById('nodeImage').value = fileName[fileName.length-1];	
  }
  
  // Toggle to only show one option at a time to avoid overflow
  var shown = true;
  $('#label').on('click', function() {
	$('#nodeLabel').toggle();
	if ( $('#nodeURL').toggle( shown ) ) {
		$('#nodeURL').toggle();
	}
  });
  
  $('#link').on('click', function() {
	$('#nodeURL').toggle();
	if ( $('#nodeLabel').toggle( shown ) ) {
		$('#nodeLabel').toggle();
	}
  });
 
  $('#nodeImage').on('click', function() {
    // Call hidden input box	
	$('#loadImage').trigger('click');
	return false;
  });

  $('#loadImage').change(function () {
    // When file is chosen from disk
	var file = document.getElementById('loadImage').files[0];
	document.getElementById('nodeImage').value = file.name;
  });

  // Shape event listener
  var shape = document.getElementById('nodeShape');
  $(shape).on('click', function () {
	// If image shape is selected, show URL input box
	if (shape.value == 'image') {
		$('#nodeImage').show();
	}
	else {
		$('#nodeImage').val('')
		$('#nodeImage').hide();
	}
  });

  $("#nodeColor").spectrum({
    color: data.color.background,
	preferredFormat: 'hex',
	showInput: true
  });

  // Bind the back button
  var backButton = document.getElementById("networkBack");
  backButton.onclick = network._createManipulatorBar.bind(network);

  // Bind the save button
  var saveButton = document.getElementById("editNodeButton");
  $(saveButton).on('click', function() {
	onAdd(data, function(finalizedData) {
	  network.nodesData.update(finalizedData);
      network._createManipulatorBar();
      network.moving = true;
      network.start();
    });
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
    "<span class='network-manipulationUI back' id='networkBack' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
	
	"<input type='button' value='Label' id='label'>" +
	"<input id='edgeLabel' class='inputLength' value='' style='display:none'>" +
	
	"<select id='edgeType' class='toolbarSpacing'>" +
	"<option value='line'>Line</option>" +
	"<option value='dash-line'>Dash</option>" +
	"<option value='arrow'>Arrow</option>" +
	"<option value='arrow-center'>Arrow2</option>" +
	"</select>" +
	
	"<select id='edgeWidth' class='toolbarSpacing'>" +
	"<option value='1'>Width</option>" +
	"<option value='1'>1</option>" +
	"<option value='1.5'>1.5</option>" +
	"<option value='2'>2</option>" +
	"<option value='2.5'>2.5</option>" +
	"</select>" +
    
    "<input type='text' id='edgeColor'/>" +

	"<span class='network-manipulationLabel'>" + 
	network.constants.labels['linkDescription'] + 
	"</span></span>";

  $('#label').on('click', function() {
	$('#edgeLabel').toggle();
  });

  $("#edgeColor").spectrum({
    color: "#45b5d6",
	preferredFormat: 'hex',
	showInput: true
  });

  // bind the icon
  var backButton = document.getElementById("networkBack");
  backButton.onclick = network._createManipulatorBar.bind(this);

  // we use the boundFunction so we can reference it when we unbind it from the "select" event.
  network.boundFunction = network._handleConnect.bind(this);
  network.on('select', network.boundFunction);

  // temporarily overload functions
  network.cachedFunctions["_handleTouch"] = network._handleTouch;
  network.cachedFunctions["_handleOnRelease"] = network._handleOnRelease;
  network._handleTouch = network._handleConnect;
  network._handleOnRelease = network._finishConnect;
  network._createEdge = createEdge;

  // redraw to show the unselect
  network._redraw();
};

/*********************************************************************/
/* Collects the data to create a link                                */
/*********************************************************************/
function onConnect(data, callback) {
  var labelInput = document.getElementById('edgeLabel');
  var typeInput = document.getElementById('edgeType');
  var widthInput = document.getElementById('edgeWidth');
  var colorInput = $('#edgeColor').spectrum('get');
	  
  data.label = labelInput.value;
  data.style = typeInput.value;
  data.width = Number(widthInput.value);
  data.color = colorInput.toHexString();
  //data.inheritColor = true;
	  
  var title = "<table>" +
			  "<tr><td><b>Edge ID:</b></td><td>"+data.id+"</td>" +
			  "<tr><td><b>Edge To:</b></td><td>"+data.to+"</td>" +
			  "<tr><td><b>Edge From:</b></td><td>"+data.from+"</td>" +
			  "<tr><td><b>Edge Label:</b></td><td>"+data.label+"</td>" +
			  "<tr><td><b>Edge Style:</b></td><td>"+data.style+"</td>" +
			  "<tr><td><b>Edge Width:</b></td><td>"+data.width+"</td>" +
			  "<tr><td><b>Edge Color:</b></td><td>"+data.color+"</td>" +
			  "</table>";
  data.title = title;

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
/* Sets the defualt data to connect two nodes with a new edge       */
/*********************************************************************/
function createEdge(sourceNodeId,targetNodeId) {
  var defaultData = {from:sourceNodeId, to:targetNodeId};
  onConnect(defaultData, function(finalizedData) {
    network.edgesData.add(finalizedData);
    network.moving = true;
    network.start();
  });
}

/*********************************************************************/
/* connect two nodes with a new edge.
/*********************************************************************/
function editEdge(sourceNodeId,targetNodeId) {
    var defaultData = {id: network.edgeBeingEdited.id, from:sourceNodeId, to:targetNodeId};
    network.edgesData.update(defaultData);
    network.moving = true;
    network.start();
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
    "<span class='network-manipulationUI back' id='networkBack' title='Back'></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none'>" +
	
	"<input type='button' value='Label' id='label'>" +
	"<input id='edgeLabel' class='inputLength' value='' style='display:none'>" +
	
	"<select id='edgeType' class='toolbarSpacing'>" +
	"<option value='line'>Line</option>" +
	"<option value='dash-line'>Dash</option>" +
	"<option value='arrow'>Arrow</option>" +
	"<option value='arrow-center'>Arrow2</option>" +
	"</select>" +
	
	"<select id='edgeWidth' class='toolbarSpacing'>" +
	"<option value='1'>1</option>" +
	"<option value='1.5'>1.5</option>" +
	"<option value='2'>2</option>" +
	"<option value='2.5'>2.5</option>" +
	"</select>" +
    
    "<input type='text' id='edgeColor'/>" +
    
	"<input type='button' value='save' id='editEdgeButton' class='toolbarSpacing'></button>"+
	
	"<span class='network-manipulationLabel'>" + 
	network.constants.labels['editEdgeDescription'] + 
	"</span></span>";
 
  var edge =  network.edgeBeingEdited;
  var options = edge.options;
  console.log(network.edgeBeingEdited)

  document.getElementById('edgeLabel').value = edge.label
  $('#edgeType').val(options.style).change()
  $('#edgeWidth').val(options.width).change()
   
  $('#label').on('click', function() {
	$('#edgeLabel').toggle();
  });
  
  $("#edgeColor").spectrum({
    color: options.color.color,
	preferredFormat: 'hex',
	showInput: true
  });

  // Bind the save button
  var saveButton = document.getElementById("editEdgeButton");
  $(saveButton).on('click', function() {
    var defaultData = {
	  id: network.edgeBeingEdited.id, 
	  from: network.edgeBeingEdited.from.id, 
	  to: network.edgeBeingEdited.to.id
	};
    onConnect(defaultData, function(finalizedData) {	
      network.edgesData.update(finalizedData);
      network._createManipulatorBar();
      network.moving = true;
      network.start();
    });
  });

  // bind the icon
  var backButton = document.getElementById("networkBack");
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
  network._editEdge		   = editEdge;

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

/*********************************************************************/
/* Clears elements in the popup
/*********************************************************************/
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
	      else if (type == "Load") {
		    loadMap(input, data);
	      }
		  else if (type == "Delete") {
			deleteMap(input, data);
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
  var fields =  ['id','label','x','y','allowedToMoveX','allowedToMoveY']
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
  //console.log(jsonData)
  
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
/* Delete map from sMind 
/*********************************************************************/
function deleteMap (id, data) {
  // If map does not exist
  if (data[id] == undefined) {
	// Replace the current popup
	clearPopup();
	$('.ui-dialog-content').append("<p id='alert'>Map does not exist!</p>");
	var buttons = { 
	  Ok: function() {
		clearPopup();
		popup("Delete");
	  },
	}
	$('#filePopup').dialog("option", "buttons", buttons);
  }
  else {
	// Replace the popup content
	clearPopup();
	$('.ui-dialog-content').append("<p id='alert'>Are you sure you want to delete this map?</p>");
	var buttons = { 
	  Cancel: function() {
	    clearPopup();
		popup("Delete");
	  },
	  Okay: function() {		  
		// Send to server		
        $.ajax({
	      type: "DELETE",
	      url: "/data/delete/" + id,
	      success: function (res) {
		    console.log(res);
		    clearPopup();
			$('#filePopup').dialog('close');
          }
        });
	  },
	};
    $('#filePopup').dialog("option", "buttons", buttons);
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

/*********************************************************************/
/* Create a semi UUID                                                */
/* source: http://stackoverflow.com/a/105074/1262753                 */
/* @return {String} uuid                                             */
/*********************************************************************/
function randomUUID() {
  var S4 = function () {
    return Math.floor(
      Math.random() * 0x10000 /* 65536 */
    ).toString(16);
  };

  return (
    S4() + S4() + '-' +
    S4() + '-' +
    S4() + '-' +
    S4() + '-' +
    S4() + S4() + S4()
  );
};


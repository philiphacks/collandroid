var data = {};
var tips = ["Drag node's outter circle to connect it with other nodes.", "Double-click on a connection to delete it."];
var lastTip = 0, nextTip = -1;

function checkUniqueId(id) {
	for (vid in data) {
		var velem = data[vid];
		var vtype = velem["type"];
		var eid = data[vid]["children"][mappings[vtype]]["id"];
		if (eid==id) return false;
	}
	return true;
}

function getDefaultValue(typeName){
    switch (typeName){
        case "IntType":
            return 0;
        case "StringType":
            return "";
        case "BooleanType":
            return false;
        default:
            return [];
    }
}

var idre=/^[a-zA-Z_$][0-9a-zA-Z_$]*$/; 

function validateValue(typeName, value, checked){
	switch (typeName){
        case "BooleanType":
			value = checked=="checked";
			break;
        case "IntType":
			value = parseInt(value);
			if (isNaN(value)) value=null;
			break;
		case "id":
			if (!idre.test(value)) value=null;
			if ($("#"+value).length>0) value=null;
			if (!checkUniqueId(value)) value=null;
			break;		
	}
	return value;
}

function createNode(typeName, index)
{
    var typeInfo = meta[typeName];
    console.log(JSON.stringify(typeInfo));
    var instance = {type:typeName, potency:typeInfo["potency"]-1, children:{}};
    
	if (index==-1){
		index = 1;    
		while (typeName+index in data) index+=1;
	}
	instance["id"] = typeName+index;

    for (child in typeInfo["children"])
    {
        var field = typeInfo["children"][child];
        if (field["potency"]>0) {
            if (child.substring(0,3)=="ref") {
				instance["children"][child] = createNode(field["type"], index);
            } else {
                instance["children"][child] = {value:getDefaultValue(field["type"]), type:field["type"]};
            }
        }
    }
    return instance;
}

function renderData()
{
    where = $("#__data");
    for (id in data) {
        item = data[id];
        typeName = item['type'];
        
        // los edges se actualizan solos
        if (meta[typeName]["type"]=="VEdge") continue;
		
        typeInfo = meta[typeName];
        
		var classes = typeInfo["type"] + " ";
        
        // Añade el elemento
        var myDiv = $("#"+id);
        if (myDiv.length==0) {
			where.append("<div id='"+id+"' class='"+classes+typeName+"'></div>");
			myDiv = $("#"+id);
			
			if (item["children"]["x"]["value"]==0) {
				var pos = myDiv.position();
				data[this.id]["children"]["x"]["value"]=pos.left;
				data[this.id]["children"]["y"]["value"]=pos.top;
			}
			myDiv.css("left", item["children"]["x"]["value"]);
			myDiv.css("top", item["children"]["y"]["value"]);
			$("<a class='__cx'></a>").appendTo(myDiv);
		}
        
        $("*",myDiv).not(".__cx").remove();
        $.tmpl(getValue(typeInfo, "templateHtml"),item).appendTo(myDiv);
    }

    for (typeName in meta) {
		if (meta[typeName]["type"]=="VBehaviour") continue;
        items = meta[typeName]["inherit"];
        for (behN in items)
        {
            behaviour = items[behN];
			if (behaviour in meta && meta[behaviour]["type"]=="VBehaviour")	{
				eval("$('."+typeName+"')."+behaviour.toLowerCase()+"("+meta[behaviour]["children"]["options"]["value"]+");");
			}
        }
    }
    
    updateCode();
}

$.widget( "custom.properties", {
	_create: function() {
		var self = jQuery.custom.properties.self = this;
		self.me = $(this.element[0]);
		$("input",self.me).live("change", this,
			function(e) {
				var newVal = $(this).val().trim();
				if (this.name=="oid")
				{
					newVal = validateValue("id",newVal);
					if (newVal==null) {
						setStatus("error", "Cannot use the given identifier.");
						$(this).val(self.oitem["id"]);
						return;
					}
					// Actualiza conexiones con el nuevo id
					var conns = jsPlumb.getConnections({"target":self.vitem["id"]});
					for (c in conns)
					{
						var info = conns[c];
						var sprop = mappings[data[info.sourceId]['type']];
						data[info.sourceId]["children"][sprop]["children"][info.propertyName]["value"] = newVal;
					}
					self.oitem["id"] = newVal;
					setStatus("ok", "Identifier changed.");
				} else {
					var elems = getSelection().toArray();
					newVal = validateValue(self.oitem["children"][this.name]["type"],newVal, $(this).attr("checked"));
					if (newVal==null) {
						setStatus("error", "Invalid value for "+this.name+".");
						$(this).val(getValue(self.oitem,this.name));
						return;
					}
					
					for (elem in elems) {
						var vitem = data[elems[elem].id];
						var refTypeName = vitem['type'];
						var oitem = vitem["children"][mappings[refTypeName]];
						setValue(oitem,this.name,newVal);
					}
					setStatus("ok", "Value of " + this.name + " changed for selected node"+(elems.length>1?"s":"")+".");
				}
				renderData();
				jsPlumb.repaintEverything();
			}
		);
		
		$(document).bind("selectionChanged", this.onSelectionChanged);
	},
	onSelectionChanged: function(e, obj) {
		var self = jQuery.custom.properties.self;
		
		var elems = getSelection().toArray();
		if (elems.length==0) {
			self.me.html("&nbsp;");
			return;
		}
		
		var types = {}
		for (elem in elems) {
			var vitem = data[elems[elem].id];
			var refTypeName = vitem['type'];
			var oitem = vitem["children"][mappings[refTypeName]];
			
			self.vitem = vitem;self.oitem = oitem;
		
			var typeName = oitem["type"];
			if (typeName in types)
				types[typeName].push(oitem);
			else
				types[typeName] = [oitem];
		}
		
		var editableTypes = ["IntType","StringType","BooleanType"];
		
		var title = "", first = true; 
		var fields = {}, typesLen = 0;
		for (type in types){
			typesLen++;
			var typeInfo = meta[type];
			if (first) {
				for (child in typeInfo["children"])
				{
					var field = typeInfo["children"][child];
					
					if (editableTypes.indexOf(field["type"])==-1) continue;
					
					fields[child] = jQuery.extend(true,{},field);
					fields[child]["__count"] = 1;
					
					var value = getValue(types[type][0],child);
					for (obj in types[type]) {
						if (getValue(types[type][obj],child)!=value) {
							value = null;
							break;
						}
					}
					fields[child]["__value"] = value;
				}
				first = false;
			} else {
				for (child in typeInfo["children"])
				{
					if (child in fields) {
						// Sólo permite editar a la vez propiedades que sean del mismo tipo 
						if (fields[child]["type"]!=typeInfo["children"][child]["type"]) continue;
						fields[child]["__count"]++;
						var value = fields[child]["__value"];
						if (value!=null) {
							for (obj in types[type]) {
								if (getValue(types[type][obj],child)!=value) {
									value = null;
									break;
								}
							}
							fields[child]["__value"] = value;
						}
					}
				}
			}
			title += "+"+type+(types[type].length>1?"s":"");
		}
		
		self.me.html("<h2>"+title.substring(1)+"</h2>");
		if (elems.length==1) {
			self.me.append($("<div><p>id</p><input type='text' name='oid' value='"+self.oitem["id"]+"'/></div>"));
		}
		
		for (child in fields)
		{
			var field = fields[child];
			if (field["__count"]!=typesLen || field["potency"]>1) continue;
			
			var value = field["__value"];
			if (value==null) value = "";
			
			if (field["type"]=="BooleanType")
			{
				inputType = "checkbox";
				valueRepr = (value?" checked":"");
			}
			else {
				inputType = "text";
				valueRepr = " value='"+value+"'";
			}
			self.me.append($("<div><p>"+child+"</p><input type='"+inputType+"' name='"+child+"'"+valueRepr+"/></div>"));
		}
	}
});

$.widget( "custom.connectable", {
	_create: function() {
		var myId = this.element[0].id;
		var myType = data[myId]["type"];
		var refType = meta[myType]["children"][mappings[myType]]["type"];
		
		var me = $(".__cx", this.element[0]);
		jsPlumb.makeSource(me, {
				parent:me.parent(),
				endpoint:{
					anchor:"Continuous",
					connector:[ "StateMachine", { curviness:15 } ],
					connectorStyle:{ strokeStyle:"black",lineWidth:2 },
					connectorOverlays:[["Arrow",{location:1, length:10}]],
					maxConnections:-1
				}
			});

		jsPlumb.makeTarget($(this.element[0]), {
			dropOptions:{ hoverClass:"dragHover" },
			endpoint:{
				anchor:"Continuous"
			}
		});
	
		$(this.element).bind( "drag", function(event, ui) {jsPlumb.repaint(this.id);});
		$(this.element).bind( "dragstop", function(event, ui) {jsPlumb.repaint(this.id);});
	}
});
$.widget( "custom.creator", {
	_create: function() {
		this.element.click(function(){
            instance = createNode(getValue(model[this.id.substring(2)], "ref"),-1);
            data[instance["id"]] = instance;
            renderData();
        });
        
	}
});

$.widget( "custom.eraser", {
	_create: function() {
		jQuery.custom.eraser.self = this;
		jQuery.custom.eraser.obj = null;
		
		var deleter = function() {
			var elems = getSelection();
			elems.each(function() {
				if (this.ends)
				{
					conns = jsPlumb.getConnections({source:this.ends[0], target:this.ends[1]});
					for(var i=0;i<conns.length;i++)
						deleteConn(conns[i]);
				} else {
					var id = this.id;
					conns = jsPlumb.getConnections({target:id});
					for(var i=0;i<conns.length;i++)
						deleteConn(conns[i]);
					conns = jsPlumb.getConnections({source:id});
					for(var i=0;i<conns.length;i++)
						deleteConn(conns[i]);
					jsPlumb.removeAllEndpoints(id);
					delete data[id];
				}
			});
			elems.remove();
			renderData();
			setStatus("ok", "Item"+(elems.length>1?"s":"")+" deleted.");
			
			$(document).trigger("selectionChanged");
        };
        
        this.element.click(deleter);
        $(document).bind('keydown', 'del', deleter);
        
		$(document).bind("selectionChanged", function(e,obj){
			var self = jQuery.custom.eraser.self;
			if (selectionCount()==0) {
				$(self.element[0]).button( "option", "disabled", true);
			} else {
				$(self.element[0]).button( "option", "disabled", false);
			}
		});
	}
});

$.widget( "custom.downloader", {
	_create: function() {
		this.originalText = $(this.element[0]).html();		
	},
	updateLink: function() {
		$(this.element[0].firstChild).html("<a href=\"data:text/metadepth;charset=utf-8," + encodeURIComponent(getCode()) + "\">" + this.originalText + "</a>");
	}
});


function getValue(object, property)
{
    if (property in object["children"])
        return object["children"][property]["value"];
    else
        return null;
}
function setValue(object,property,value)
{
	if (property in object["children"]) {
        object["children"][property]["value"]=value;
	}
}


function renderIDE(where)
{
    for (id in model) {
        item = model[id];
        typeName = item['type'];
        typeInfo = meta[typeName];
        where.append("<div id='__"+id+"' class='"+typeName+"'></div>");
        $.tmpl(getValue(typeInfo, "templateHtml"),item).appendTo("#__"+id);
    }
    
    for (typeName in meta) {
		if (meta[typeName]["type"]=="VBehaviour") continue;
        items = meta[typeName]["inherit"];
        for (behN in items)
        {
            behaviour = items[behN];
			if (behaviour in meta && meta[behaviour]["type"]=="VBehaviour") {
				eval("$('."+typeName+"')."+behaviour.toLowerCase()+"();");
			}
        }
    }
}

var currentConnection = null;

$(function (){
	jsPlumb.Defaults.Endpoint = ["Dot", {radius:3, cssClass:"endpoint"}];
			
	jsPlumb.bind("ready", function() {
		renderIDE($("#__tools"));
		$("#__data").selectable({ distance: 5, 
			selected:function(e,info){
				$(document).trigger("selectionChanged");
			},
			unselected:function(e,info){
				$(document).trigger("selectionChanged");
			}
		});
	});
	
	jsPlumb.bind("beforeDrop", function(info) {
		
		// Almacena información de la conexión para uso posterior
		saveConnectionInfo(info);
		
		var props = [], edges = [];
		getValidPropertiesAndEdges(props, edges);
			
		// No hay propiedades que puedan ser conectadas
		if (props.length==0 && edges.length==0) { 
			clearConnectionInfo();
			setStatus("error", "Invalid connection.");
			return false;
		} else if (props.length+edges.length>1) {
			showConnectionOptions(props, edges);
			return false;
		} else {
			if (currentConnection.isEdge = edges.length==1) {
				saveEdgeInfo(edges[0]);
			} else {
				currentConnection.property = props[0];
			}
			return checkConnection();
		}
	});
	
	jsPlumb.bind("jsPlumbConnection", function(info) {
		currentConnection.info = info;
		updateConnectionData();
		setConnectionLabel();
		
		setStatus("ok", "Connection stablished.");
		
		clearConnectionInfo();
	});
	
	
	jsPlumb.bind("dblclick", function(info){
		deleteConn(info);
	});
	
	jsPlumb.setAutomaticRepaint(true);
	
	$("div.ui-draggable","#__data").live( "dragstart", function(event, ui) {
		if (!$(this).hasClass("ui-selected")) select(this);
		this.startDrag=$(this).position();
	});
	$("div.ui-draggable","#__data").live( "drag", function(event, ui) {
		var nowDrag=$(this).position();
		var diffDrag={"left":nowDrag.left-this.startDrag.left,"top":nowDrag.top-this.startDrag.top};
		$("div.ui-draggable.ui-selected").not(this).each(function(){
			var pos=$(this).offset();
			$(this).offset({"top":pos.top+diffDrag.top,"left":pos.left+diffDrag.left});
			jsPlumb.repaint(this.id);
		});
		this.startDrag=$(this).position();
		this.hasDragged=true;
	});
	$("div.ui-draggable","#__data").live("mouseup", function(e){
		if (this.hasDragged) {
			this.hasDragged=false;
		} else {
			select(this);
		}
	});
	
	$("div.ui-draggable","#__data").live( "dragstop", function(event, ui) {
		if (this.id in data) {
			var pos = $(this).position();
			data[this.id]["children"]["x"]["value"]=pos.left;
			data[this.id]["children"]["y"]["value"]=pos.top;
		}
	});
	
	$(".Edge","#__data").live("mouseup", function(e){
		select(this);
	});
	
	$("#__data").click(function(e){if(e.target.id=="__data")select(null)});
	
	showTip();
	
	$(document).trigger("selectionChanged");
});

function saveConnectionInfo(info) {
	currentConnection = {};
	currentConnection.info = info;
	
	currentConnection.vsource = data[info.sourceId];
	currentConnection.vtarget = data[info.targetId];
	currentConnection.sprop = mappings[currentConnection.vsource['type']];
	currentConnection.tprop = mappings[currentConnection.vtarget['type']];
	currentConnection.source = currentConnection.vsource["children"][currentConnection.sprop];
	currentConnection.target = currentConnection.vtarget["children"][currentConnection.tprop];
	
	currentConnection.sourceType = currentConnection.source["type"];
	currentConnection.targetType = currentConnection.target["type"];
}

function getValidPropertiesAndEdges(props, edges) {
	var sprops = meta[currentConnection.sourceType]["children"];	
	for (var prop in sprops)
	{
		var proptype = sprops[prop]["type"];
		if (proptype==currentConnection.targetType)
			props.push(prop);
		else {
			if (proptype in meta && meta[proptype]["type"]=="Edge") {
				edges.push(proptype);
			}
		}
	}
	// Quita los edges inválidos y las propiedades asociadas a edges
	var edgeIndex = 0; 
	while (edgeIndex<edges.length) {
		var edge = meta[edges[edgeIndex]]["children"];
		var source=null, target=null;
		for (prop in edge)
		{
			if ("edgePos" in edge[prop]) {
				var pos = edge[prop]["edgePos"];
				if (pos==1) source = prop;
				else target = prop;
			}
		}
		
		// quita propiedades del edge
		var proppos = props.indexOf(source);
		if (proppos!=-1) props.splice(proppos,1);
		proppos = props.indexOf(target);
		if (proppos!=-1) props.splice(proppos,1);
		
		
		// quita edges inválidos
		if (source==null || target==null || edge[source]["type"]!=currentConnection.targetType || edge[target]["type"]!=currentConnection.sourceType) {
			edges.splice(edgeIndex,1);
		} else {
			edgeIndex++;
		}
	}
}

function showConnectionOptions(props, edges) {
	var dialog = "";
	var middle = 0;
	for (e in edges) {
		dialog += "<option>"+edges[e]+"</option>";
		middle+=1;
	}
	for (p in props) {
		dialog += "<option>"+props[p]+"</option>";
	}
	
	currentConnection.isEdge = middle>0;
	if (middle>0)
		if (currentConnection.isEdge) {
			saveEdgeInfo(edges[0]);
		} else {
			currentConnection.property = props[0];
		}
	
	$("<div>Choose property: <select id='connprop'>"+dialog+"</select></div>").dialog(
		{ title:"New connection", resizable:false, modal: true, minHeight:100, 
		buttons: [{ text: "Ok", click: function() {
				if (checkConnection())
					jsPlumb.connect({uuids:['ep_'+currentConnection.vsource["id"], 'ep_'+currentConnection.vtarget["id"]]});
				else
					clearConnectionInfo();
				$(this).dialog("close"); 
			}}],
		close: function() {
				if (currentConnection != null) {
					clearConnectionInfo();
				}
			}
		}
	);
	$("select#connprop").change(function(){
		currentConnection.isEdge=$(this).attr("selectedIndex")<middle;
		if (currentConnection.isEdge) {
			saveEdgeInfo($(this).val());
		} else {
			currentConnection.property = $(this).val();
		}
	});
}

function checkConnection() {
	if (currentConnection.isEdge)
	{
		currentConnection.sourceValue = currentConnection.source["children"][currentConnection.edge.source]["value"];
		if (!checkConnectionEnd(currentConnection.sourceValue, currentConnection.target["id"], meta[currentConnection.sourceType]["children"][currentConnection.edge.source]["max"])) return false;
		currentConnection.targetValue = currentConnection.target["children"][currentConnection.edge.target]["value"];
		if (!checkConnectionEnd(currentConnection.targetValue, currentConnection.source["id"], meta[currentConnection.targetType]["children"][currentConnection.edge.target]["max"])) return false;
	} else {
		currentConnection.sourceValue = currentConnection.source["children"][currentConnection.property]["value"];
		if (!checkConnectionEnd(currentConnection.sourceValue, currentConnection.target["id"], meta[currentConnection.sourceType]["children"][currentConnection.property]["max"])) return false;
	}
	return true;
}

function checkConnectionEnd(end, newElem, max) {
	if (end.indexOf(newElem)==-1) {
		// Check cardinality limits
		if (max>-1) {
			if (max<=end.length) {
				setStatus("error", "Limit of this kind of connections reached.");
				return false;
			}
		}
	} else {
		setStatus("warning", "Connection already exists.");
		return false;
	}
	return true;
}

function saveEdgeInfo(edge) {
	currentConnection.edge = {}
	currentConnection.edge.type = edge;
	currentConnection.edge.vtype = mappings[currentConnection.edge.type];
	
	var edgeChildren = meta[edge]["children"];
	for (var prop in edgeChildren)
	{
		if ("edgePos" in edgeChildren[prop]) {
			var pos = edgeChildren[prop]["edgePos"];
			
			if (pos==1)
				currentConnection.edge.source = prop;
			else
				currentConnection.edge.target = prop;
		}
	}
}

function updateConnectionData() {
	
	if (currentConnection.isEdge) {
		currentConnection.edge.vitem = createNode(currentConnection.edge.vtype,-1);
		data[currentConnection.edge.vitem["id"]] = currentConnection.edge.vitem;
		currentConnection.edge.item = currentConnection.edge.vitem["children"][mappings[currentConnection.edge.vtype]];
		
		currentConnection.targetValue.push(currentConnection.source["id"]);
		currentConnection.edge.item["children"][currentConnection.edge.target]["value"].push(currentConnection.source["id"]);
		currentConnection.edge.item["children"][currentConnection.edge.source]["value"].push(currentConnection.target["id"]);
	}
	
	currentConnection.sourceValue.push(currentConnection.target["id"]);
	currentConnection.info.connection.context = currentConnection;
}


function setConnectionLabel() {
	
	if (currentConnection.isEdge) {
		var labelPaint = function(label) {
			var temp = $("<div></div>");
			$.tmpl(label.template, label.vitem).appendTo(temp);
			return temp.html();
		}
		
		currentConnection.info.connection.addOverlay(["Label", {label:"", location:0.5, cssClass:"Edge", id:currentConnection.edge.vitem["id"]}]);
		var label = currentConnection.info.connection.getOverlay(currentConnection.edge.vitem["id"]);
		label.getElement().id = currentConnection.edge.vitem["id"];
		label.getElement().ends = [currentConnection.vsource["id"],currentConnection.vtarget["id"]];
		label.vitem = currentConnection.edge.vitem;
		label.template = getValue(meta[currentConnection.edge.vtype], "templateHtml");
		label.setLabel(labelPaint);
	} else
		currentConnection.info.connection.addOverlay(["Label", {label:currentConnection.property, location:0.5, cssClass:"label"}]);
}

function clearConnectionInfo() {
	jsPlumb.repaintEverything();
	currentConnection = null;
}

function select(elem) {
	$(".ui-selected").removeClass("ui-selected");
	if (elem!=null) $(elem).addClass("ui-selected");
	$(document).trigger("selectionChanged");
}
function getSelection(){
	return $(".ui-selectable > .VNode.ui-selected").add($(".ui-selectable > .Edge.ui-selected"));
}
function selectionCount(){
	return getSelection().length;
}

function deleteConn(info) {
	var context = info.context;
	
	var idx = context.sourceValue.indexOf(context.target["id"]);
	if(idx!=-1) context.sourceValue.splice(idx, 1);
	
	if (context.isEdge)
	{
		idx = context.targetValue.indexOf(context.source["id"]);
		if(idx!=-1) context.targetValue.splice(idx, 1);
		
		delete data[context.edge.item["id"]];
		delete data[context.edge.vitem["id"]];
	}
	jsPlumb.detach(info);
	
	setStatus("ok", "Connection deleted.");
}

function setStatus(type,message) {
	var status = $("#__status");
	status.removeClass();
	status.addClass(type);
	status.html("");
	status.append("<p>"+message+"</p>");
	if (nextTip!=-1) clearTimeout(nextTip);
	nextTip = setTimeout(showTip, 30000);
	updateCode();
}

function showTip() {
	setStatus("tip", tips[lastTip]); 
	lastTip++;
	if (lastTip>=tips.length) lastTip = 0;
	if (nextTip!=-1) clearTimeout(nextTip);
	nextTip = setTimeout(showTip, 30000);
}

function updateCode() {
	$("#__code").html("<pre>"+getCode()+"</pre>");
	$(".VDownload").data("downloader").updateLink();
}



function toMetadepth(type, name, obj, defs) {
	var ret = "";
	var elems = [];
	
	for (velemName in obj) {
		elems.push(obj[velemName]);
	}
	
	while (elems.length>0) {
		var elem = elems.pop();
		var elemName = elem["id"];
		
		var edgeParts = "";
		var retelem = "";
		for (fieldName in elem["children"]) {
			var field = elem["children"][fieldName];
			var fieldDef = defs[elem["type"]]["children"][fieldName];
			if (isPrimitive(field["type"]))
				retelem += "\t\t" + fieldName + " = " + toConstantValue(field["type"], field["value"]) + ";\n"; 
			else {
				//console.log('Field = ' + JSON.stringify(field));
				//console.log('FieldDef = ' + JSON.stringify(fieldDef));
				//console.log('Defs for ' + fieldDef.type + ' = ' + JSON.stringify(defs[fieldDef.type]));
				if ("id" in field) {
					retelem += "\t\t" + fieldName + " = " + field["id"] + ";\n";
					elems.push(field);
				} else if (field["max"]==1) {
					if (field["value"].length>=1)
						retelem += "\t\t" + fieldName + " = " + field["value"][0] + ";\n";
					else
						retelem += "\t\t" + fieldName + " = null;\n";	
				} else if ("edgePos" in fieldDef) {
					if (fieldDef["edgePos"]==1)
						edgeParts = "(" + field["value"] + edgeParts;
					else
						edgeParts += "," + field["value"] + ")";
				} else if (defs[fieldDef["type"]]["type"]!="Edge") {
					retelem += "\t\t" + fieldName + " = [" + field["value"].toString() + "];\n";
				}
			}
		}
		retelem = "\t" + elem["type"] + " " + elemName + edgeParts + " {\n" + retelem + "\t}\n";
		ret = retelem + ret ;
	}
	ret = type + " " + name + " {\n" + ret + "}";
	return ret;
}

function isPrimitive(type){
	return ["IntType","StringType","BooleanType"].indexOf(type)!=-1;
}

function toConstantValue(type,value){
    switch (type){
        case "IntType":
            return value;
        case "StringType":
            return "\""+value+"\"";
        case "BooleanType":
            return value;
	}
}

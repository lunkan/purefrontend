
(function() {

	/**
	 * SCRIPT QUEUE
	 * Put script in a queue and add sequently in order after markup is updated
	 * to simulate ordinary page load 
	 */
	var scriptQueue = [];
	var loadNextScript = function() {
	
		var self = this;
		
		var scriptTempEl = scriptQueue.shift();
		if(!scriptTempEl)
			return;
		
		var newScriptNode = document.createElement('script');
		
		//real browsers
		newScriptNode.onload = function() {
			loadNextScript();
		}
		
		//Internet explorer
		newScriptNode.onreadystatechange = function() {
			if (this.readyState == 'loaded') {
				loadNextScript();
			}
		}
		
		if(scriptTempEl.attributes) {
			for (var i = 0; i < scriptTempEl.attributes.length; i++) {
				var attrib = scriptTempEl.attributes[i];
				/*if(attrib.name.toLowerCase() === "iesrc") {
					newScriptNode.setAttribute("src", attrib.value);
				}
				else {*/
					newScriptNode.setAttribute(attrib.name, attrib.value);
				//}
			}
		}
						
		scriptTempEl.parentNode.insertBefore(newScriptNode, scriptTempEl);
		scriptTempEl.parentNode.removeChild(scriptTempEl);
	}
	
	/**
	 * IE COMPABILITY
	 */
	function appendStringAsNodes(element, html) {

		//IE ignores comment element if first child (fix)
		html = "<p>temp</p>" + html;
									
		var frag = document.createDocumentFragment(),
			tmp = document.createElement('body'), child;
		tmp.innerHTML = html;
		
		// Append elements in a loop to a DocumentFragment, so that the browser does
		// not re-render the document for each node
		while (child = tmp.firstChild) {
			frag.appendChild(child);
		}
		
		element.appendChild(frag); // Now, append all elements at once
		element.removeChild(element.firstChild); // remove fix (se above)
		frag = tmp = null;
	}
	
	/**
	 * IMPORT
	 */
	function applyImport(node) {

		var child = node.firstChild;
		while (child) {
			
			if(child.nodeType === 1) {
				applyImport(child);
			}
			else if(child.nodeType === 8 && child.nodeValue.indexOf('import') !== -1) {
				
				try {
					var fileUrl = child.nodeValue.toString().match(/\(([^)]*)\)[^(]*$/)[1];
					
					if(!fileUrl) {
						continue;
					}
				} catch(e) {
					continue;
				}
				
				var xhReq;
				if (window.XMLHttpRequest) {
					xhReq = new XMLHttpRequest();
				} else if (window.ActiveXObject) {
					xhReq = new ActiveXObject("Microsoft.XMLHTTP");
				}
				
				try {
					xhReq.open("GET", fileUrl, false);//false -> Not asyncronius?
					xhReq.send(null);//null
				} catch(e) {
				
					//Assume Google chrome local enviroment - user must use chrome extension to access local files
					if(navigator.userAgent.toLowerCase().indexOf('chrome') > -1 && extensionId) {
						fileUrl = "chrome-extension://" + extensionId + "/" + fileUrl.split("/").pop();
						
						try {
							xhReq.open("GET", fileUrl, false);//false -> Not asyncronius?
							xhReq.send(null);//null
						} catch(e) {
							return;
						}
					}
					else {
						return;
					}
				}
				
				var commentElement = child;
				var serverResponse = xhReq.responseText;
				var importerEl = document.createElement(commentElement.parentNode.nodeName.toLowerCase());
				
				if(window.ActiveXObject) {
					appendStringAsNodes(importerEl, serverResponse);
				}
				else {
					importerEl.innerHTML = serverResponse;
				}
				
				var importedChild = importerEl.firstChild;
				while(importedChild) {
					
					//create a reference to next in order to stay in the loop when element is moved in DOM-tree
					var nextChild = importedChild.nextSibling;
					
					//Add imported node
					//Obs! Script nodes must be created syncroniosly to sustain internal order
					if(importedChild.nodeName.toLowerCase() == "script" || importedChild.nodeName.toLowerCase() == "iescript") {
						
						var dummyScriptNode = document.createElement('meta');
						if(importedChild.attributes) {
							for (var i = 0; i < importedChild.attributes.length; i++) {
								var attrib = importedChild.attributes[i];
								dummyScriptNode.setAttribute(attrib.name, attrib.value);
							}
						}
						
						commentElement.parentNode.insertBefore(dummyScriptNode, commentElement);
						scriptQueue.push(dummyScriptNode);
					}
					else {
						commentElement.parentNode.insertBefore(importedChild, commentElement);
					}
				
					//Search and apply "import" in the imported node
					applyImport(importedChild);
					
					importedChild = nextChild;
				}
			
				//remove comment element - continue to avoid double ".nextSibling"
				child = commentElement.nextSibling;
				commentElement.parentNode.removeChild(commentElement);
				continue;
			}
			
			child = child.nextSibling;
		}
	}
	
	/**
	 * REPEAT
	 */
	var repeatArgRegExp = new RegExp("repeat\\(([^()]+?)\\)","i");
	
	function applyRepeat(node) {

		var child = node.firstChild;
		while (child) {
		
			if(child.nodeType === 1) {
				//Apply repeat to child-nodes
				applyRepeat(child);
			}
			else if(child.nodeType === 8) {
	
				var repeatArg = repeatArgRegExp.exec(child.nodeValue);
				if(repeatArg) {
				
					//trim
					var numLoops = repeatArg[1].replace(" ", "");
					if(numLoops.indexOf(":") !== -1) {
						var randArgs = numLoops.split(":");
						var rnd = Math.round(Math.random()*(parseInt(randArgs[1])-parseInt(randArgs[0])));
						numLoops = rnd + parseInt(randArgs[0]);
					}
					
					//Make a reference to the comment element
					//Search element to clone (next non-text-node)
					var commentElement = child;
					var cloneElement = child.nextSibling;
					while (cloneElement && cloneElement.nodeType === 3) {
						cloneElement = cloneElement.nextSibling;
					}
					
					//Only element nodes are repeatable - move to next if not
					if(cloneElement.nodeType === 1) {
					
						//Add clones
						for(var j = 1, jl = numLoops; j <= numLoops; j++) {
							
							var clone = cloneElement.cloneNode(false);
							
							//replace attributes
							if(clone.attributes) {
								for (var i = 0; i < clone.attributes.length; i++) {
									var attrib = clone.attributes[i];
									clone.setAttribute(attrib.name, attrib.value.replace(/\{i\}/, j));
								}
							}
							
							//replace content
							if(cloneElement.innerHTML && cloneElement.firstChild) {
								
								var innerHtmlType = cloneElement.firstChild.nodeType;
								var innerHtmlStr = cloneElement.innerHTML.replace(/\{i\}/, j);
								
								//IE Compability
								if(window.ActiveXObject) {
									appendStringAsNodes(clone, innerHtmlStr);
								}
								else {
									clone.innerHTML = innerHtmlStr;
								}
							}
							
							//Apply repeat to children after loop (children may have repeaters with random arg)
							applyRepeat(clone);
						
							child.parentNode.insertBefore(clone, cloneElement);
							child = clone;
						}
						
						//remove original element (contains unreplaced content)
						child.parentNode.removeChild(cloneElement);
						
						//remove comment element
						child.parentNode.removeChild(commentElement);
					}
				}
			}
			
			child = child.nextSibling;
		}
	}
	
	/**
	 * Generate Lorum ipsum text
	 */
	var loremIpsumWordBank = new Array("lorem","ipsum","dolor","sit","amet,","consectetur","adipisicing","elit,","sed","do","eiusmod","tempor","incididunt","ut","labore","et","dolore","magna","aliqua.","enim","ad","minim","veniam,","quis","nostrud","exercitation","ullamco","laboris","nisi","ut","aliquip","ex","ea","commodo","consequat.","duis","aute","irure","dolor","in","reprehenderit","in","voluptate","velit","esse","cillum","dolore","eu","fugiat","nulla","pariatur.","excepteur","sint","occaecat","cupidatat","non","proident,","sunt","in","culpa","qui","officia","deserunt","mollit","anim","id","est","laborum.","sed","ut","perspiciatis,","unde","omnis","iste","natus","error","sit","voluptatem","accusantium","doloremque","laudantium,","totam","rem","aperiam","eaque","ipsa,","quae","ab","illo","inventore","veritatis","et","quasi","architecto","beatae","vitae","dicta","sunt,","explicabo.","nemo","enim","ipsam","voluptatem,","quia","voluptas","sit,","aspernatur","aut","odit","aut","fugit,","sed","quia","consequuntur","magni","dolores","eos,","qui","ratione","voluptatem","sequi","nesciunt,","neque","porro","quisquam","est,","qui","dolorem","ipsum,","quia","dolor","sit,","amet,","consectetur,","adipisci","velit,","sed","quia","non","numquam","eius","modi","tempora","incidunt,","ut","labore","et","dolore","magnam","aliquam","quaerat","voluptatem.","ut","enim","ad","minima","veniam,","quis","nostrum","exercitationem","ullam","corporis","suscipit","laboriosam,","nisi","ut","aliquid","ex","ea","commodi","consequatur?","quis","autem","vel","eum","iure","reprehenderit,","qui","in","ea","voluptate","velit","esse,","quam","nihil","molestiae","consequatur,","vel","illum,","qui","dolorem","eum","fugiat,","quo","voluptas","nulla","pariatur?","at","vero","eos","et","accusamus","et","iusto","odio","dignissimos","ducimus,","qui","blanditiis","praesentium","voluptatum","deleniti","atque","corrupti,","quos","dolores","et","quas","molestias","excepturi","sint,","obcaecati","cupiditate","non","provident,","similique","sunt","in","culpa,","qui","officia","deserunt","mollitia","animi,","id","est","laborum","et","dolorum","fuga.","harum","quidem","rerum","facilis","est","et","expedita","distinctio.","Nam","libero","tempore,","cum","soluta","nobis","est","eligendi","optio,","cumque","nihil","impedit,","quo","minus","id,","quod","maxime","placeat,","facere","possimus,","omnis","voluptas","assumenda","est,","omnis","dolor","repellendus.","temporibus","autem","quibusdam","aut","officiis","debitis","aut","rerum","necessitatibus","saepe","eveniet,","ut","et","voluptates","repudiandae","sint","molestiae","non","recusandae.","itaque","earum","rerum","hic","tenetur","a","sapiente","delectus,","aut","reiciendis","voluptatibus","maiores","alias","consequatur","aut","perferendis","doloribus","asperiores","repellat");
	var genereateLoremIpsum = function(option) {
			
		var numCharSpan = option.max - option.min;
		var simpleGaussianValue = (Math.random()*0.5 + Math.random()*0.5);
		var numChars = option.min + (simpleGaussianValue * numCharSpan);
		
		var loremTxt = ".";
		while(loremTxt.length < numChars){
			
			var rand = Math.random();
			var nextWord = loremIpsumWordBank[Math.floor(rand * (loremIpsumWordBank.length - 1))];
			
			//Check for uppercase - "." and "?"
			if (loremTxt.substring(loremTxt.length-1, loremTxt.length) == "." || loremTxt.substring(loremTxt.length-1,loremTxt.length) == "?") {
				nextWord = nextWord.substring(0,1).toUpperCase() + nextWord.substring(1, nextWord.length);
			}
			
			loremTxt += " " + nextWord;
		}
		
		//Remove first char and cut end if to long
		loremTxt = loremTxt.slice(1, Math.min(loremTxt.length-1, option.max-1));
		return loremTxt;
	};
	
	/**
	 * Generate Names
	 */
	var namesWordBank = new Array("Abudius", "Adaucius", "Aelius", "Babudius", "Caecilius", "Caelius", "Caesennius", "Decrius", "Desticius", "Didius", "Ecimius", "Eprius", "Exomnius", "Fabius", "Gargilius", "Helvidius", "Ingenuius", "Julius", "Liburnius", "Mercatius", "Nestorius", "Octavius", "Pompeius", "Quinctilius", "Roscius", "Saturius", "Terentius", "Ulpius", "Virius");
	var generateNames = function(option) {
			
		var loremTxt = ".";
		for(var i=0; i < 2; i++) {
			
			var rand = Math.random();
			var nextName = namesWordBank[Math.floor(rand * (namesWordBank.length - 1))];
			loremTxt += " " + nextName;
		}
		
		//Remove first char
		loremTxt = loremTxt.slice(1, -1);
		return loremTxt;
	};
	
	/**
	 * Generate Mail
	 */
	var generateMail = function(option) {
			
		var loremTxt = "";
		for(var i=0; i < 2; i++) {
			
			var rand = Math.random();
			var nextName = namesWordBank[Math.floor(rand * (namesWordBank.length - 1))];
			loremTxt += "@" + nextName;
		}
		
		//Remove first char
		loremTxt = loremTxt.slice(1, -1).toLowerCase() + ".com";
		return loremTxt;
	};
	
	/**
	 * Generate Street Address
	 */
	var generateStreetAddress = function(option) {
			
		var loremTxt = " ";
		
		//Street name
		for(var i=0; i < Math.ceil(Math.random()*3); i++) {
			
			var rand = Math.random();
			var nextName = namesWordBank[Math.floor(rand * (namesWordBank.length - 1))];
			loremTxt += " " + nextName;
		}
		
		//Street number
		loremTxt += " " + Math.floor(Math.random()*1000) + ",";
		
		//Postal code
		loremTxt += " " + Math.random().toString(36).substring(7, 8).toUpperCase() + Math.floor(Math.random()*10000) + Math.random().toString(36).substring(7, 10).toUpperCase();
		
		//City
		loremTxt += " " + namesWordBank[Math.floor(rand * (namesWordBank.length - 1))] + ",";
		
		//Country
		loremTxt += " " + namesWordBank[Math.floor(rand * (namesWordBank.length - 1))].toUpperCase();
		
		//Remove first char
		loremTxt = loremTxt.slice(1, -1);
		return loremTxt
	};
	
	/**
	 * Generate Phone
	 */
	var generatePhone = function(option) {
			
		var loremTxt = "+" + Math.floor(Math.random()*10);
		for(var i=0; i < 3; i++) {
			loremTxt += " " + Math.floor(Math.random()*1000);
		}
		
		return loremTxt;
	};
	 
	/**
	 * REPLACE
	 */
	var conditionalRegexp = new RegExp("\\{([^}]*)}","g");
	var trimRegexp = new RegExp("\\s","g");
	
	var replaceOptions = {
		title : {
			min : 5,
			max : 70,
			method: genereateLoremIpsum
		},
		excerpt : {
			min : 35,
			max : 100,
			method: genereateLoremIpsum
		},
		paragraph : {
			min : 20,
			max : 500,
			method: genereateLoremIpsum
		},
		name : {
			method : generateNames
		},
		phone : {
			method : generatePhone
		},
		mail : {
			method : generateMail
		},
		address : {
			method: generateStreetAddress
		}
	};
	
	function replaceString($0, $1) {
		
		var argument = $1.replace(trimRegexp, "").toLowerCase();
		
		for (var optionName in replaceOptions) {
			if(optionName === argument) {
				var option = replaceOptions[optionName];
				return option.method(option);
			}
		}
		
		//Conditional replace
		var conditionalArgs = argument.split("?");
		if(conditionalArgs.length != 2) {
			return $0;
		}
		
		var replaceArgs = conditionalArgs[1].split(":");
		if(window.location.hash.indexOf(conditionalArgs[0]) !== -1) {
			return replaceArgs[0];
		}
		else if(replaceArgs[1]) {
			return replaceArgs[1];
		}
		else {
			return "";
		}
	}
	
	function applyReplace(node) {

		var child = node.firstChild;
		while (child) {
		
			//Apply repeat to child-nodes if element node
			//Or apply replace to text-nodes
			if(child.nodeType === 1) {
				applyReplace(child);
				
				if(child.attributes) {
					for (var i = 0; i < child.attributes.length; i++) {
						var attrib = child.attributes[i];
						var attrValue = attrib.value.replace(conditionalRegexp, replaceString);
						child.setAttribute(attrib.name, attrValue);
					}
				}
			}
			else if(child.nodeType === 3) {
				child.nodeValue = child.nodeValue.replace(conditionalRegexp, replaceString);
			}
			
			child = child.nextSibling;
		}
	}
	
	/**
	 * INIT
	 */
	
	//Make page invisible until loaded
	document.getElementsByTagName('body')[0].style.visibility="hidden";
	 
	//Fix Remove purefrontend.js script to prevent eternal loop in some browsers - IE etc
	var scrips = document.getElementsByTagName('script');
	for (var i = 0; i < scrips.length; i++) {
		
		if (scrips[i].getAttribute("src")) {
			if (scrips[i].getAttribute("src").toString().match(/purefrontend.js/)) {
				scrips[i].parentNode.removeChild(scrips[i]);
				break;
			}
		}
	}
	 
	var nodes = applyImport(document.getElementsByTagName('html')[0]);
	var nodes = applyRepeat(document.getElementsByTagName('html')[0]);
	var nodes = applyReplace(document.getElementsByTagName('html')[0]);
	
	//Load scripts - must be in syncronised order
	loadNextScript();
	
	//Reveal page
	document.getElementsByTagName('body')[0].style.visibility="visible";
	
}());
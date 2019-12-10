
; /* Start:/local/lib/frontend/jquery.inputmask/inputmask.js*/
/*
 * Input Mask Core
 * http://github.com/RobinHerbots/jquery.inputmask
 * Copyright (c) 2010 -	Robin Herbots
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
 * Version: 0.0.0-dev
 */
(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["inputmask.dependencyLib"], factory);
	} else if (typeof exports === "object") {
		module.exports = factory(require("./inputmask.dependencyLib.jquery"));
	} else {
		factory(window.dependencyLib || jQuery);
	}
}
(function ($) {
	function Inputmask(alias, options) {
		//allow instanciating without new
		if (!(this instanceof Inputmask)) {
			return new Inputmask(alias, options);
		}

		if ($.isPlainObject(alias)) {
			options = alias;
		} else {
			options = options || {};
			options.alias = alias;
		}

		this.el = undefined;
		//init options
		this.opts = $.extend(true, {}, this.defaults, options);
		this.noMasksCache = options && options.definitions !== undefined;
		this.userOptions = options || {}; //user passed options
		this.events = {};
		resolveAlias(this.opts.alias, options, this.opts);
	}

	Inputmask.prototype = {
		//options default
		defaults: {
			placeholder: "_",
			optionalmarker: {
				start: "[",
				end: "]"
			},
			quantifiermarker: {
				start: "{",
				end: "}"
			},
			groupmarker: {
				start: "(",
				end: ")"
			},
			alternatormarker: "|",
			escapeChar: "\\",
			mask: null, //needs tobe null instead of undefined as the extend method does not consider props with the undefined value
			oncomplete: $.noop, //executes when the mask is complete
			onincomplete: $.noop, //executes when the mask is incomplete and focus is lost
			oncleared: $.noop, //executes when the mask is cleared
			repeat: 0, //repetitions of the mask: * ~ forever, otherwise specify an integer
			greedy: true, //true: allocated buffer for the mask and repetitions - false: allocate only if needed
			autoUnmask: false, //automatically unmask when retrieving the value with $.fn.val or value if the browser supports __lookupGetter__ or getOwnPropertyDescriptor
			removeMaskOnSubmit: false, //remove the mask before submitting the form.
			clearMaskOnLostFocus: true,
			insertMode: true, //insert the input or overwrite the input
			clearIncomplete: false, //clear the incomplete input on blur
			aliases: {}, //aliases definitions => see jquery.inputmask.extensions.js
			alias: null,
			onKeyDown: $.noop, //callback to implement autocomplete on certain keys for example. args => event, buffer, caretPos, opts
			onBeforeMask: null, //executes before masking the initial value to allow preprocessing of the initial value.	args => initialValue, opts => return processedValue
			onBeforePaste: function (pastedValue, opts) {
				return $.isFunction(opts.onBeforeMask) ? opts.onBeforeMask(pastedValue, opts) : pastedValue;
			}, //executes before masking the pasted value to allow preprocessing of the pasted value.	args => pastedValue, opts => return processedValue
			onBeforeWrite: null, //executes before writing to the masked element. args => event, opts
			onUnMask: null, //executes after unmasking to allow postprocessing of the unmaskedvalue.	args => maskedValue, unmaskedValue, opts
			showMaskOnFocus: true, //show the mask-placeholder when the input has focus
			showMaskOnHover: true, //show the mask-placeholder when hovering the empty input
			onKeyValidation: $.noop, //executes on every key-press with the result of isValid. Params: key, result, opts
			skipOptionalPartCharacter: " ", //a character which can be used to skip an optional part of a mask
			showTooltip: false, //show the activemask as tooltip
			tooltip: undefined, //tooltip to show
			numericInput: false, //numericInput input direction style (input shifts to the left while holding the caret position)
			rightAlign: false, //align to the right
			undoOnEscape: true, //pressing escape reverts the value to the value before focus
			//numeric basic properties
			radixPoint: "", //".", // | ","
			radixPointDefinitionSymbol: undefined, //set the radixPoint definitionSymbol ~ used for awareness of the radixpoint
			groupSeparator: "", //",", // | "."
			//numeric basic properties
			nojumps: false, //do not jump over fixed parts in the mask
			nojumpsThreshold: 0, //start nojumps as of
			keepStatic: null, //try to keep the mask static while typing. Decisions to alter the mask will be posponed if possible - null see auto selection for multi masks
			positionCaretOnTab: false, //when enabled the caret position is set after the latest valid position on TAB
			tabThrough: false, //allows for tabbing through the different parts of the masked field
			supportsInputType: ["text", "tel", "password"], //list with the supported input types
			definitions: {
				"9": {
					validator: "[0-9]",
					cardinality: 1,
					definitionSymbol: "*"
				},
				"a": {
					validator: "[A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5]",
					cardinality: 1,
					definitionSymbol: "*"
				},
				"*": {
					validator: "[0-9A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5]",
					cardinality: 1
				}
			},
			//specify keyCodes which should not be considered in the keypress event, otherwise the preventDefault will stop their default behavior especially in FF
			ignorables: [8, 9, 13, 19, 27, 33, 34, 35, 36, 37, 38, 39, 40, 45, 46, 93, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123],
			isComplete: null, //override for isComplete - args => buffer, opts - return true || false
			canClearPosition: $.noop, //hook to alter the clear behavior in the stripValidPositions args => maskset, position, lastValidPosition, opts => return true|false
			postValidation: null, //hook to postValidate the result from isValid.	Usefull for validating the entry as a whole.	args => buffer, currentResult, opts => return true/false
			staticDefinitionSymbol: undefined, //specify a definitionSymbol for static content, used to make matches for alternators
			jitMasking: false, //just in time masking ~ only mask while typing, can n (number), true or false
			nullable: true, //return nothing instead of the buffertemplate when the user hasn't entered anything.
			inputEventOnly: false, //testing inputfallback behavior
			positionCaretOnClick: "lvp" //none, lvp (based on the last valid position (default), radixFocus (position caret to radixpoint on initial click)
		},
		masksCache: {},
		mask: function (elems) {
			var that = this;
			if (typeof elems === "string") {
				elems = document.getElementById(elems) || document.querySelectorAll(elems);
			}
			elems = elems.nodeName ? [elems] : elems;
			$.each(elems, function (ndx, el) {
				var scopedOpts = $.extend(true, {}, that.opts);
				importAttributeOptions(el, scopedOpts, $.extend(true, {}, that.userOptions));
				var maskset = generateMaskSet(scopedOpts, that.noMasksCache);
				if (maskset !== undefined) {
					if (el.inputmask !== undefined) {
						el.inputmask.remove();
					}
					//store inputmask instance on the input with element reference
					el.inputmask = new Inputmask();
					el.inputmask.opts = scopedOpts;
					el.inputmask.noMasksCache = that.noMasksCache;
					el.inputmask.userOptions = $.extend(true, {}, that.userOptions);
					el.inputmask.el = el;
					el.inputmask.maskset = maskset;
					el.inputmask.isRTL = false;

					$.data(el, "_inputmask_opts", scopedOpts);

					maskScope({
						"action": "mask",
						"el": el
					});
				}
			});
			return elems && elems[0] ? (elems[0].inputmask || this) : this;
		},
		option: function (options, noremask) { //set extra options || retrieve value of a current option
			if (typeof options === "string") {
				return this.opts[options];
			} else if (typeof options === "object") {
				$.extend(this.userOptions, options); //user passed options
				//remask
				if (this.el && noremask !== true) {
					this.mask(this.el);
				}
				return this;
			}
		},
		unmaskedvalue: function (value) {
			return maskScope({
				"action": "unmaskedvalue",
				"el": this.el,
				"value": value
			}, this.el && this.el.inputmask ? this.el.inputmask.maskset : generateMaskSet(this.opts, this.noMasksCache), this.opts);
		},
		remove: function () {
			if (this.el) {
				maskScope({
					"action": "remove",
					"el": this.el
				});
				this.el.inputmask = undefined; //delete ~ undefined
				return this.el;
			}
		},
		getemptymask: function () { //return the default (empty) mask value, usefull for setting the default value in validation
			return maskScope({
				"action": "getemptymask"
			}, this.maskset || generateMaskSet(this.opts, this.noMasksCache), this.opts);
		},
		hasMaskedValue: function () { //check wheter the returned value is masked or not; currently only works reliable when using jquery.val fn to retrieve the value
			return !this.opts.autoUnmask;
		},
		isComplete: function () {
			return maskScope({
				"action": "isComplete",
				"el": this.el //optional
			}, this.maskset || generateMaskSet(this.opts, this.noMasksCache), this.opts);
		},
		getmetadata: function () { //return mask metadata if exists
			return maskScope({
				"action": "getmetadata"
			}, this.maskset || generateMaskSet(this.opts, this.noMasksCache), this.opts);
		},
		isValid: function (value) {
			return maskScope({
				"action": "isValid",
				"value": value
			}, this.maskset || generateMaskSet(this.opts, this.noMasksCache), this.opts);
		},
		format: function (value, metadata) {
			return maskScope({
				"action": "format",
				"value": value,
				"metadata": metadata //true/false getmetadata
			}, this.maskset || generateMaskSet(this.opts, this.noMasksCache), this.opts);
		}
	};

	//apply defaults, definitions, aliases
	Inputmask.extendDefaults = function (options) {
		$.extend(true, Inputmask.prototype.defaults, options);
	};
	Inputmask.extendDefinitions = function (definition) {
		$.extend(true, Inputmask.prototype.defaults.definitions, definition);
	};
	Inputmask.extendAliases = function (alias) {
		$.extend(true, Inputmask.prototype.defaults.aliases, alias);
	};
	//static fn on inputmask
	Inputmask.format = function (value, options, metadata) {
		return Inputmask(options).format(value, metadata);
	};
	Inputmask.unmask = function (value, options) {
		return Inputmask(options).unmaskedvalue(value);
	};
	Inputmask.isValid = function (value, options) {
		return Inputmask(options).isValid(value);
	};
	Inputmask.remove = function (elems) {
		$.each(elems, function (ndx, el) {
			if (el.inputmask) el.inputmask.remove();
		});
	};
	Inputmask.escapeRegex = function (str) {
		var specials = ["/", ".", "*", "+", "?", "|", "(", ")", "[", "]", "{", "}", "\\", "$", "^"];
		return str.replace(new RegExp("(\\" + specials.join("|\\") + ")", "gim"), "\\$1");
	};
	Inputmask.keyCode = {
		ALT: 18,
		BACKSPACE: 8,
		BACKSPACE_SAFARI: 127,
		CAPS_LOCK: 20,
		COMMA: 188,
		COMMAND: 91,
		COMMAND_LEFT: 91,
		COMMAND_RIGHT: 93,
		CONTROL: 17,
		DELETE: 46,
		DOWN: 40,
		END: 35,
		ENTER: 13,
		ESCAPE: 27,
		HOME: 36,
		INSERT: 45,
		LEFT: 37,
		MENU: 93,
		NUMPAD_ADD: 107,
		NUMPAD_DECIMAL: 110,
		NUMPAD_DIVIDE: 111,
		NUMPAD_ENTER: 108,
		NUMPAD_MULTIPLY: 106,
		NUMPAD_SUBTRACT: 109,
		PAGE_DOWN: 34,
		PAGE_UP: 33,
		PERIOD: 190,
		RIGHT: 39,
		SHIFT: 16,
		SPACE: 32,
		TAB: 9,
		UP: 38,
		WINDOWS: 91,
		X: 88
	};

	//helper functions
	function isInputEventSupported(eventName) {
		var el = document.createElement("input"),
			evName = "on" + eventName,
			isSupported = (evName in el);
		if (!isSupported) {
			el.setAttribute(evName, "return;");
			isSupported = typeof el[evName] == "function";
		}
		el = null;
		return isSupported;
	}

	function isElementTypeSupported(input, opts) {
		var elementType = input.getAttribute("type");
		var isSupported = (input.tagName === "INPUT" && $.inArray(elementType, opts.supportsInputType) !== -1) || input.isContentEditable || input.tagName === "TEXTAREA";
		if (!isSupported && input.tagName === "INPUT") {
			var el = document.createElement("input");
			el.setAttribute("type", elementType);
			isSupported = el.type === "text"; //apply mask only if the type is not natively supported
			el = null;
		}
		return isSupported;
	}

	function resolveAlias(aliasStr, options, opts) {
		var aliasDefinition = opts.aliases[aliasStr];
		if (aliasDefinition) {
			if (aliasDefinition.alias) resolveAlias(aliasDefinition.alias, undefined, opts); //alias is another alias
			$.extend(true, opts, aliasDefinition); //merge alias definition in the options
			$.extend(true, opts, options); //reapply extra given options
			return true;
		} else //alias not found - try as mask
		if (opts.mask === null) {
			opts.mask = aliasStr;
		}

		return false;
	}

	function importAttributeOptions(npt, opts, userOptions) {
		var attrOptions = npt.getAttribute("data-inputmask"),
			option, dataoptions, optionData, p;

		function importOption(option, optionData) {
			optionData = optionData !== undefined ? optionData : npt.getAttribute("data-inputmask-" + option);
			if (optionData !== null) {
				if (typeof optionData === "string") {
					if (option.indexOf("on") === 0) optionData = window[optionData]; //get function definition
					else if (optionData === "false") optionData = false;
					else if (optionData === "true") optionData = true;
				}
				userOptions[option] = optionData;
			}
		}

		if (attrOptions && attrOptions !== "") {
			attrOptions = attrOptions.replace(new RegExp("'", "g"), '"');
			dataoptions = JSON.parse("{" + attrOptions + "}");
		}

		//resolve aliases
		if (dataoptions) { //pickup alias from data-inputmask
			optionData = undefined;
			for (p in dataoptions) {
				if (p.toLowerCase() === "alias") {
					optionData = dataoptions[p];
					break;
				}
			}
		}
		importOption("alias", optionData); //pickup alias from data-inputmask-alias
		if (userOptions.alias) {
			resolveAlias(userOptions.alias, userOptions, opts);
		}

		for (option in opts) {
			if (dataoptions) {
				optionData = undefined;
				for (p in dataoptions) {
					if (p.toLowerCase() === option.toLowerCase()) {
						optionData = dataoptions[p];
						break;
					}
				}
			}
			importOption(option, optionData);
		}

		$.extend(true, opts, userOptions);
		return opts;
	}

	function generateMaskSet(opts, nocache) {
		var ms;

		function analyseMask(mask) {
			var tokenizer = /(?:[?*+]|\{[0-9\+\*]+(?:,[0-9\+\*]*)?\})|[^.?*+^${[]()|\\]+|./g,
				escaped = false,
				currentToken = new MaskToken(),
				match,
				m,
				openenings = [],
				maskTokens = [],
				openingToken,
				currentOpeningToken,
				alternator,
				lastMatch,
				groupToken;

			function MaskToken(isGroup, isOptional, isQuantifier, isAlternator) {
				this.matches = [];
				this.isGroup = isGroup || false;
				this.isOptional = isOptional || false;
				this.isQuantifier = isQuantifier || false;
				this.isAlternator = isAlternator || false;
				this.quantifier = {
					min: 1,
					max: 1
				};
			}

			//test definition => {fn: RegExp/function, cardinality: int, optionality: bool, newBlockMarker: bool, casing: null/upper/lower, def: definitionSymbol, placeholder: placeholder, mask: real maskDefinition}
			function insertTestDefinition(mtoken, element, position) {
				var maskdef = opts.definitions[element];
				position = position !== undefined ? position : mtoken.matches.length;
				var prevMatch = mtoken.matches[position - 1];
				if (maskdef && !escaped) {
					maskdef.placeholder = $.isFunction(maskdef.placeholder) ? maskdef.placeholder(opts) : maskdef.placeholder;
					var prevalidators = maskdef.prevalidator,
						prevalidatorsL = prevalidators ? prevalidators.length : 0;
					//handle prevalidators
					for (var i = 1; i < maskdef.cardinality; i++) {
						var prevalidator = prevalidatorsL >= i ? prevalidators[i - 1] : [],
							validator = prevalidator.validator,
							cardinality = prevalidator.cardinality;
						mtoken.matches.splice(position++, 0, {
							fn: validator ? typeof validator === "string" ? new RegExp(validator) : new function () {
								this.test = validator;
							} : new RegExp("."),
							cardinality: cardinality ? cardinality : 1,
							optionality: mtoken.isOptional,
							newBlockMarker: prevMatch === undefined || prevMatch.def !== (maskdef.definitionSymbol || element),
							casing: maskdef.casing,
							def: maskdef.definitionSymbol || element,
							placeholder: maskdef.placeholder,
							mask: element
						});
						prevMatch = mtoken.matches[position - 1];
					}
					mtoken.matches.splice(position++, 0, {
						fn: maskdef.validator ? typeof maskdef.validator == "string" ? new RegExp(maskdef.validator) : new function () {
							this.test = maskdef.validator;
						} : new RegExp("."),
						cardinality: maskdef.cardinality,
						optionality: mtoken.isOptional,
						newBlockMarker: prevMatch === undefined || prevMatch.def !== (maskdef.definitionSymbol || element),
						casing: maskdef.casing,
						def: maskdef.definitionSymbol || element,
						placeholder: maskdef.placeholder,
						mask: element
					});
				} else {
					mtoken.matches.splice(position++, 0, {
						fn: null,
						cardinality: 0,
						optionality: mtoken.isOptional,
						newBlockMarker: prevMatch === undefined || prevMatch.def !== element,
						casing: null,
						def: opts.staticDefinitionSymbol || element,
						placeholder: opts.staticDefinitionSymbol !== undefined ? element : undefined,
						mask: element
					});
					escaped = false;
				}
			}

			function verifyGroupMarker(lastMatch, isOpenGroup) {
				if (lastMatch.isGroup) { //this is not a group but a normal mask => convert
					lastMatch.isGroup = false;
					insertTestDefinition(lastMatch, opts.groupmarker.start, 0);
					if (isOpenGroup !== true) {
						insertTestDefinition(lastMatch, opts.groupmarker.end);
					}
				}
			}

			function maskCurrentToken(m, currentToken, lastMatch, extraCondition) {
				if (currentToken.matches.length > 0 && (extraCondition === undefined || extraCondition)) {
					lastMatch = currentToken.matches[currentToken.matches.length - 1];
					verifyGroupMarker(lastMatch);
				}
				insertTestDefinition(currentToken, m);
			}

			function defaultCase() {
				if (openenings.length > 0) {
					currentOpeningToken = openenings[openenings.length - 1];
					maskCurrentToken(m, currentOpeningToken, lastMatch, !currentOpeningToken.isAlternator);
					if (currentOpeningToken.isAlternator) { //handle alternator a | b case
						alternator = openenings.pop();
						for (var mndx = 0; mndx < alternator.matches.length; mndx++) {
							alternator.matches[mndx].isGroup = false; //don't mark alternate groups as group
						}
						if (openenings.length > 0) {
							currentOpeningToken = openenings[openenings.length - 1];
							currentOpeningToken.matches.push(alternator);
						} else {
							currentToken.matches.push(alternator);
						}
					}
				} else {
					maskCurrentToken(m, currentToken, lastMatch);
				}
			}

			function reverseTokens(maskToken) {
				function reverseStatic(st) {
					if (st === opts.optionalmarker.start) st = opts.optionalmarker.end;
					else if (st === opts.optionalmarker.end) st = opts.optionalmarker.start;
					else if (st === opts.groupmarker.start) st = opts.groupmarker.end;
					else if (st === opts.groupmarker.end) st = opts.groupmarker.start;

					return st;
				}

				maskToken.matches = maskToken.matches.reverse();
				for (var match in maskToken.matches) {
					var intMatch = parseInt(match);
					if (maskToken.matches[match].isQuantifier && maskToken.matches[intMatch + 1] && maskToken.matches[intMatch + 1].isGroup) { //reposition quantifier
						var qt = maskToken.matches[match];
						maskToken.matches.splice(match, 1);
						maskToken.matches.splice(intMatch + 1, 0, qt);
					}
					if (maskToken.matches[match].matches !== undefined) {
						maskToken.matches[match] = reverseTokens(maskToken.matches[match]);
					} else {
						maskToken.matches[match] = reverseStatic(maskToken.matches[match]);
					}
				}

				return maskToken;
			}

			while (match = tokenizer.exec(mask)) {
				m = match[0];

				if (escaped) {
					defaultCase();
					continue;
				}
				switch (m.charAt(0)) {
					case opts.escapeChar:
						escaped = true;
						break;
					case opts.optionalmarker.end:
					// optional closing
					case opts.groupmarker.end:
						// Group closing
						openingToken = openenings.pop();
						if (openingToken !== undefined) {
							if (openenings.length > 0) {
								currentOpeningToken = openenings[openenings.length - 1];
								currentOpeningToken.matches.push(openingToken);
								if (currentOpeningToken.isAlternator) { //handle alternator (a) | (b) case
									alternator = openenings.pop();
									for (var mndx = 0; mndx < alternator.matches.length; mndx++) {
										alternator.matches[mndx].isGroup = false; //don't mark alternate groups as group
									}
									if (openenings.length > 0) {
										currentOpeningToken = openenings[openenings.length - 1];
										currentOpeningToken.matches.push(alternator);
									} else {
										currentToken.matches.push(alternator);
									}
								}
							} else {
								currentToken.matches.push(openingToken);
							}
						} else defaultCase();
						break;
					case opts.optionalmarker.start:
						// optional opening
						openenings.push(new MaskToken(false, true));
						break;
					case opts.groupmarker.start:
						// Group opening
						openenings.push(new MaskToken(true));
						break;
					case opts.quantifiermarker.start:
						//Quantifier
						var quantifier = new MaskToken(false, false, true);

						m = m.replace(/[{}]/g, "");
						var mq = m.split(","),
							mq0 = isNaN(mq[0]) ? mq[0] : parseInt(mq[0]),
							mq1 = mq.length === 1 ? mq0 : (isNaN(mq[1]) ? mq[1] : parseInt(mq[1]));
						if (mq1 === "*" || mq1 === "+") {
							mq0 = mq1 === "*" ? 0 : 1;
						}
						quantifier.quantifier = {
							min: mq0,
							max: mq1
						};
						if (openenings.length > 0) {
							var matches = openenings[openenings.length - 1].matches;
							match = matches.pop();
							if (!match.isGroup) {
								groupToken = new MaskToken(true);
								groupToken.matches.push(match);
								match = groupToken;
							}
							matches.push(match);
							matches.push(quantifier);
						} else {
							match = currentToken.matches.pop();
							if (!match.isGroup) {
								groupToken = new MaskToken(true);
								groupToken.matches.push(match);
								match = groupToken;
							}
							currentToken.matches.push(match);
							currentToken.matches.push(quantifier);
						}
						break;
					case opts.alternatormarker:
						if (openenings.length > 0) {
							currentOpeningToken = openenings[openenings.length - 1];
							lastMatch = currentOpeningToken.matches.pop();
						} else {
							lastMatch = currentToken.matches.pop();
						}
						if (lastMatch.isAlternator) {
							openenings.push(lastMatch);
						} else {
							alternator = new MaskToken(false, false, false, true);
							alternator.matches.push(lastMatch);
							openenings.push(alternator);
						}
						break;
					default:
						defaultCase();
				}
			}

			while (openenings.length > 0) {
				openingToken = openenings.pop();
				verifyGroupMarker(openingToken, true);
				currentToken.matches.push(openingToken);
			}
			if (currentToken.matches.length > 0) {
				lastMatch = currentToken.matches[currentToken.matches.length - 1];
				verifyGroupMarker(lastMatch);
				maskTokens.push(currentToken);
			}

			if (opts.numericInput) {
				reverseTokens(maskTokens[0]);
			}
			// console.log(JSON.stringify(maskTokens));
			return maskTokens;
		}

		function generateMask(mask, metadata) {
			if (mask === null || mask === "") {
				return undefined;
			} else {
				if (mask.length === 1 && opts.greedy === false && opts.repeat !== 0) {
					opts.placeholder = "";
				} //hide placeholder with single non-greedy mask
				if (opts.repeat > 0 || opts.repeat === "*" || opts.repeat === "+") {
					var repeatStart = opts.repeat === "*" ? 0 : (opts.repeat === "+" ? 1 : opts.repeat);
					mask = opts.groupmarker.start + mask + opts.groupmarker.end + opts.quantifiermarker.start + repeatStart + "," + opts.repeat + opts.quantifiermarker.end;
				}

				// console.log(mask);
				var masksetDefinition;
				if (Inputmask.prototype.masksCache[mask] === undefined || nocache === true) {
					masksetDefinition = {
						"mask": mask,
						"maskToken": analyseMask(mask),
						"validPositions": {},
						"_buffer": undefined,
						"buffer": undefined,
						"tests": {},
						"metadata": metadata
					};
					if (nocache !== true) {
						Inputmask.prototype.masksCache[opts.numericInput ? mask.split("").reverse().join("") : mask] = masksetDefinition;
						masksetDefinition = $.extend(true, {}, Inputmask.prototype.masksCache[opts.numericInput ? mask.split("").reverse().join("") : mask]);
					}
				} else masksetDefinition = $.extend(true, {}, Inputmask.prototype.masksCache[opts.numericInput ? mask.split("").reverse().join("") : mask]);

				return masksetDefinition;
			}
		}

		function preProcessMask(mask) {
			mask = mask.toString();
			// if (opts.numericInput) {
			// 	mask = mask.split('').reverse();
			// 	mask = mask.join('');
			// }
			return mask;
		}

		if ($.isFunction(opts.mask)) { //allow mask to be a preprocessing fn - should return a valid mask
			opts.mask = opts.mask(opts);
		}
		if ($.isArray(opts.mask)) {
			if (opts.mask.length > 1) {
				opts.keepStatic = opts.keepStatic === null ? true : opts.keepStatic; //enable by default when passing multiple masks when the option is not explicitly specified
				var altMask = "(";
				$.each(opts.numericInput ? opts.mask.reverse() : opts.mask, function (ndx, msk) {
					if (altMask.length > 1) {
						altMask += ")|(";
					}
					if (msk.mask !== undefined && !$.isFunction(msk.mask)) {
						altMask += preProcessMask(msk.mask);
					} else {
						altMask += preProcessMask(msk);
					}
				});
				altMask += ")";
				return generateMask(altMask, opts.mask);
			} else opts.mask = opts.mask.pop();
		}

		if (opts.mask) {
			if (opts.mask.mask !== undefined && !$.isFunction(opts.mask.mask)) {
				ms = generateMask(preProcessMask(opts.mask.mask), opts.mask);
			} else {
				ms = generateMask(preProcessMask(opts.mask), opts.mask);
			}
		}

		return ms;
	}

	var ua = navigator.userAgent,
		mobile = /mobile/i.test(ua),
		iemobile = /iemobile/i.test(ua),
		iphone = /iphone/i.test(ua) && !iemobile;
	//android = /android.*safari.*/i.test(ua) && !iemobile;

	//masking scope
	//actionObj definition see below
	function maskScope(actionObj, maskset, opts) {
		var isRTL = false,
			undoValue,
			el, $el,
			skipKeyPressEvent = false, //Safari 5.1.x - modal dialog fires keypress twice workaround
			skipInputEvent = false, //skip when triggered from within inputmask
			ignorable = false,
			maxLength,
			mouseEnter = true;

		//maskset helperfunctions
		function getMaskTemplate(baseOnInput, minimalPos, includeInput) {
			minimalPos = minimalPos || 0;
			var maskTemplate = [],
				ndxIntlzr, pos = 0,
				test, testPos, lvp = getLastValidPosition();
			maxLength = el !== undefined ? el.maxLength : undefined;
			if (maxLength === -1) maxLength = undefined;
			do {
				if (baseOnInput === true && getMaskSet().validPositions[pos]) {
					var validPos = getMaskSet().validPositions[pos];
					test = validPos.match;
					ndxIntlzr = validPos.locator.slice();
					maskTemplate.push(includeInput === true ? validPos.input : getPlaceholder(pos, test));
				} else {
					testPos = getTestTemplate(pos, ndxIntlzr, pos - 1);
					test = testPos.match;
					ndxIntlzr = testPos.locator.slice();
					if (opts.jitMasking === false || pos < lvp || (isFinite(opts.jitMasking) && opts.jitMasking > pos)) {
						maskTemplate.push(getPlaceholder(pos, test));
					}
				}
				pos++;
			} while ((maxLength === undefined || pos < maxLength) && (test.fn !== null || test.def !== "") || minimalPos > pos);
			if (maskTemplate[maskTemplate.length - 1] === "") {
				maskTemplate.pop(); //drop the last one which is empty
			}

			getMaskSet().maskLength = pos + 1;
			return maskTemplate;
		}

		function getMaskSet() {
			return maskset;
		}

		function resetMaskSet(soft) {
			var maskset = getMaskSet();
			maskset.buffer = undefined;
			if (soft !== true) {
				maskset.tests = {};
				maskset._buffer = undefined;
				maskset.validPositions = {};
				maskset.p = 0;
			}
		}

		function getLastValidPosition(closestTo, strict, validPositions) {
			var before = -1,
				after = -1,
				valids = validPositions || getMaskSet().validPositions; //for use in valhook ~ context switch
			if (closestTo === undefined) closestTo = -1;
			for (var posNdx in valids) {
				var psNdx = parseInt(posNdx);
				if (valids[psNdx] && (strict || valids[psNdx].match.fn !== null)) {
					if (psNdx <= closestTo) before = psNdx;
					if (psNdx >= closestTo) after = psNdx;
				}
			}
			return (before !== -1 && (closestTo - before) > 1) || after < closestTo ? before : after;
		}

		function setValidPosition(pos, validTest, fromSetValid, isSelection) {
			if (isSelection || (opts.insertMode && getMaskSet().validPositions[pos] !== undefined && fromSetValid === undefined)) {
				//reposition & revalidate others
				var positionsClone = $.extend(true, {}, getMaskSet().validPositions),
					lvp = getLastValidPosition(),
					i;
				for (i = pos; i <= lvp; i++) { //clear selection
					delete getMaskSet().validPositions[i];
				}
				getMaskSet().validPositions[pos] = validTest;
				var valid = true,
					j, vps = getMaskSet().validPositions, needsValidation = false;
				for (i = (j = pos); i <= lvp; i++) {
					var t = positionsClone[i];
					if (t !== undefined) {
						var posMatch = j,
							prevPosMatch = -1;
						while (posMatch < getMaskSet().maskLength && ((t.match.fn == null && vps[i] && (vps[i].match.optionalQuantifier === true || vps[i].match.optionality === true)) || t.match.fn != null)) {
							//determine next position
							if (t.match.fn === null || (!opts.keepStatic && vps[i] && (vps[i + 1] !== undefined && getTests(i + 1, vps[i].locator.slice(), i).length > 1 || vps[i].alternation !== undefined))) {
								posMatch++;
							} else posMatch = seekNext(j);

							if (needsValidation === false && positionsClone[posMatch] && positionsClone[posMatch].match.def === t.match.def) { //obvious match
								getMaskSet().validPositions[posMatch] = $.extend(true, {}, positionsClone[posMatch]);
								getMaskSet().validPositions[posMatch].input = t.input;
								j = posMatch;
								valid = true;
								break;
							} else if (positionCanMatchDefinition(posMatch, t.match.def)) { //validated match
								var result = isValid(posMatch, t.input, true, true);
								valid = result !== false;
								j = (result.caret || result.insert) ? getLastValidPosition() : posMatch;
								needsValidation = true;
								if (valid) break;
							} else {
								valid = t.match.fn == null;
								if (prevPosMatch === posMatch) break; //prevent endless loop
								prevPosMatch = posMatch;
							}
						}
					}
					if (!valid) break;
				}

				if (!valid) {
					getMaskSet().validPositions = $.extend(true, {}, positionsClone);
					resetMaskSet(true);
					return false;
				}
			} else getMaskSet().validPositions[pos] = validTest;

			resetMaskSet(true);
			return true;
		}

		function stripValidPositions(start, end, nocheck, strict) {
			function IsEnclosedStatic(pos) {
				var posMatch = getMaskSet().validPositions[pos];
				if (posMatch !== undefined && posMatch.match.fn === null) {
					var prevMatch = getMaskSet().validPositions[pos - 1],
						nextMatch = getMaskSet().validPositions[pos + 1];
					return prevMatch !== undefined && nextMatch !== undefined;
				}
				return false;
			}

			var i, startPos = start,
				positionsClone = $.extend(true, {}, getMaskSet().validPositions), needsValidation = false;
			getMaskSet().p = start; //needed for alternated position after overtype selection

			for (i = end - 1; i >= startPos; i--) { //clear selection
				if (getMaskSet().validPositions[i] !== undefined) {
					if (nocheck === true ||
						(!IsEnclosedStatic(i) && opts.canClearPosition(getMaskSet(), i, getLastValidPosition(), strict, opts) !== false)) {
						delete getMaskSet().validPositions[i];
					}
				}
			}

			//clear buffer
			resetMaskSet(true);
			for (i = startPos + 1; i <= getLastValidPosition();) {
				while (getMaskSet().validPositions[startPos] !== undefined) startPos++;
				var s = getMaskSet().validPositions[startPos];
				if (i < startPos) i = startPos + 1;
				// while (getMaskSet().validPositions[i] == undefined) i++;
				if ((getMaskSet().validPositions[i] !== undefined || !isMask(i)) && s === undefined) {
					var t = getTestTemplate(i);
					if (needsValidation === false && positionsClone[startPos] && positionsClone[startPos].match.def === t.match.def) { //obvious match
						getMaskSet().validPositions[startPos] = $.extend(true, {}, positionsClone[startPos]);
						getMaskSet().validPositions[startPos].input = t.input;
						delete getMaskSet().validPositions[i];
						i++;
					} else if (positionCanMatchDefinition(startPos, t.match.def)) {
						if (isValid(startPos, t.input || getPlaceholder(i), true) !== false) {
							delete getMaskSet().validPositions[i];
							i++;
							needsValidation = true;
						}
					} else if (!isMask(i)) {
						i++;
						startPos--;
					}
					startPos++;
				} else i++;
			}

			resetMaskSet(true);
		}

		function getTestTemplate(pos, ndxIntlzr, tstPs) {
			var testPos = getMaskSet().validPositions[pos];
			if (testPos === undefined) {
				var testPositions = getTests(pos, ndxIntlzr ? ndxIntlzr.slice() : ndxIntlzr, tstPs),
					lvp = getLastValidPosition(),
					lvTest = getMaskSet().validPositions[lvp] || getTests(0)[0],
					lvTestAltArr = (lvTest.alternation !== undefined) ? lvTest.locator[lvTest.alternation].toString().split(",") : [];
				for (var ndx = 0; ndx < testPositions.length; ndx++) {
					testPos = testPositions[ndx];

					if (testPos.match &&
						(((opts.greedy && testPos.match.optionalQuantifier !== true) || (testPos.match.optionality === false || testPos.match.newBlockMarker === false) && testPos.match.optionalQuantifier !== true) &&
						((lvTest.alternation === undefined || lvTest.alternation !== testPos.alternation) ||
						(testPos.locator[lvTest.alternation] !== undefined && checkAlternationMatch(testPos.locator[lvTest.alternation].toString().split(","), lvTestAltArr))))) {
						break;
					}
				}
			}

			return testPos;
		}

		function getTest(pos) {
			if (getMaskSet().validPositions[pos]) {
				return getMaskSet().validPositions[pos].match;
			}
			return getTests(pos)[0].match;
		}

		function positionCanMatchDefinition(pos, def) {
			var valid = false,
				tests = getTests(pos);
			for (var tndx = 0; tndx < tests.length; tndx++) {
				if (tests[tndx].match && tests[tndx].match.def === def) {
					valid = true;
					break;
				}
			}
			return valid;
		}

		function selectBestMatch(pos, alternateNdx) {
			var bestMatch, indexPos;
			if (getMaskSet().tests[pos] || getMaskSet().validPositions[pos]) {
				$.each(getMaskSet().tests[pos] || [getMaskSet().validPositions[pos]], function (ndx, lmnt) {
					var ndxPos = lmnt.alternation ? lmnt.locator[lmnt.alternation].toString().indexOf(alternateNdx) : -1;
					if ((indexPos === undefined || ndxPos < indexPos) && ndxPos !== -1) {
						bestMatch = lmnt;
						indexPos = ndxPos;
					}
				});
			}
			return bestMatch;
		}

		function getTests(pos, ndxIntlzr, tstPs) {
			var maskTokens = getMaskSet().maskToken,
				testPos = ndxIntlzr ? tstPs : 0,
				ndxInitializer = ndxIntlzr ? ndxIntlzr.slice() : [0],
				matches = [],
				insertStop = false,
				latestMatch,
				cacheDependency = ndxIntlzr ? ndxIntlzr.join("") : "";

			function resolveTestFromToken(maskToken, ndxInitializer, loopNdx, quantifierRecurse) { //ndxInitializer contains a set of indexes to speedup searches in the mtokens
				function handleMatch(match, loopNdx, quantifierRecurse) {
					function isFirstMatch(latestMatch, tokenGroup) {
						var firstMatch = $.inArray(latestMatch, tokenGroup.matches) === 0;
						if (!firstMatch) {
							$.each(tokenGroup.matches, function (ndx, match) {
								if (match.isQuantifier === true) {
									firstMatch = isFirstMatch(latestMatch, tokenGroup.matches[ndx - 1]);
									if (firstMatch) return false;
								}
							});
						}
						return firstMatch;
					}

					function resolveNdxInitializer(pos, alternateNdx) {
						var bestMatch = selectBestMatch(pos, alternateNdx);
						return bestMatch ? bestMatch.locator.slice(bestMatch.alternation + 1) : [];
					}

					if (testPos > 10000) {
						throw "Inputmask: There is probably an error in your mask definition or in the code. Create an issue on github with an example of the mask you are using. " + getMaskSet().mask;
					}
					if (testPos === pos && match.matches === undefined) {
						matches.push({
							"match": match,
							"locator": loopNdx.reverse(),
							"cd": cacheDependency
						});
						return true;
					} else if (match.matches !== undefined) {
						if (match.isGroup && quantifierRecurse !== match) { //when a group pass along to the quantifier
							match = handleMatch(maskToken.matches[$.inArray(match, maskToken.matches) + 1], loopNdx);
							if (match) return true;
						} else if (match.isOptional) {
							var optionalToken = match;
							match = resolveTestFromToken(match, ndxInitializer, loopNdx, quantifierRecurse);
							if (match) {
								latestMatch = matches[matches.length - 1].match;
								if (isFirstMatch(latestMatch, optionalToken)) {
									insertStop = true; //insert a stop
									testPos = pos; //match the position after the group
								} else return true;
							}
						} else if (match.isAlternator) {
							var alternateToken = match,
								malternateMatches = [],
								maltMatches,
								currentMatches = matches.slice(),
								loopNdxCnt = loopNdx.length;
							var altIndex = ndxInitializer.length > 0 ? ndxInitializer.shift() : -1;
							if (altIndex === -1 || typeof altIndex === "string") {
								var currentPos = testPos,
									ndxInitializerClone = ndxInitializer.slice(),
									altIndexArr = [],
									amndx;
								if (typeof altIndex == "string") {
									altIndexArr = altIndex.split(",");
								} else {
									for (amndx = 0; amndx < alternateToken.matches.length; amndx++) {
										altIndexArr.push(amndx);
									}
								}
								for (var ndx = 0; ndx < altIndexArr.length; ndx++) {
									amndx = parseInt(altIndexArr[ndx]);
									matches = [];
									//set the correct ndxInitializer
									ndxInitializer = resolveNdxInitializer(testPos, amndx);
									match = handleMatch(alternateToken.matches[amndx] || maskToken.matches[amndx], [amndx].concat(loopNdx), quantifierRecurse) || match;
									if (match !== true && match !== undefined && (altIndexArr[altIndexArr.length - 1] < alternateToken.matches.length)) { //no match in the alternations (length mismatch) => look further
										var ntndx = $.inArray(match, maskToken.matches) + 1;
										if (maskToken.matches.length > ntndx) {
											match = handleMatch(maskToken.matches[ntndx], [ntndx].concat(loopNdx.slice(1, loopNdx.length)), quantifierRecurse);
											if (match) {
												altIndexArr.push(ntndx.toString());
												$.each(matches, function (ndx, lmnt) {
													lmnt.alternation = loopNdx.length - 1;
												});
											}
										}
									}
									maltMatches = matches.slice();
									testPos = currentPos;
									matches = [];
									//cloneback
									for (var i = 0; i < ndxInitializerClone.length; i++) {
										ndxInitializer[i] = ndxInitializerClone[i];
									}
									//fuzzy merge matches
									for (var ndx1 = 0; ndx1 < maltMatches.length; ndx1++) {
										var altMatch = maltMatches[ndx1];
										altMatch.alternation = altMatch.alternation || loopNdxCnt;
										for (var ndx2 = 0; ndx2 < malternateMatches.length; ndx2++) {
											var altMatch2 = malternateMatches[ndx2];
											//verify equality
											if (altMatch.match.def === altMatch2.match.def && (typeof altIndex !== "string" || $.inArray(altMatch.locator[altMatch.alternation].toString(), altIndexArr) !== -1)) {
												if (altMatch.match.mask === altMatch2.match.mask) {
													maltMatches.splice(ndx1, 1);
													ndx1--;
												}
												if (altMatch2.locator[altMatch.alternation].toString().indexOf(altMatch.locator[altMatch.alternation]) === -1) {
													altMatch2.locator[altMatch.alternation] = altMatch2.locator[altMatch.alternation] + "," + altMatch.locator[altMatch.alternation];
													altMatch2.alternation = altMatch.alternation; //we pass the alternation index => used in determineLastRequiredPosition
												}
												break;
											}
										}
									}
									malternateMatches = malternateMatches.concat(maltMatches);
								}

								if (typeof altIndex == "string") { //filter matches
									malternateMatches = $.map(malternateMatches, function (lmnt, ndx) {
										if (isFinite(ndx)) {
											var mamatch,
												alternation = lmnt.alternation,
												altLocArr = lmnt.locator[alternation].toString().split(",");
											lmnt.locator[alternation] = undefined;
											lmnt.alternation = undefined;

											for (var alndx = 0; alndx < altLocArr.length; alndx++) {
												mamatch = $.inArray(altLocArr[alndx], altIndexArr) !== -1;
												if (mamatch) { //rebuild the locator with valid entries
													if (lmnt.locator[alternation] !== undefined) {
														lmnt.locator[alternation] += ",";
														lmnt.locator[alternation] += altLocArr[alndx];
													} else lmnt.locator[alternation] = parseInt(altLocArr[alndx]);

													lmnt.alternation = alternation;
												}
											}

											if (lmnt.locator[alternation] !== undefined) return lmnt;
										}
									});
								}

								matches = currentMatches.concat(malternateMatches);
								testPos = pos;
								insertStop = matches.length > 0; //insert a stopelemnt when there is an alternate - needed for non-greedy option
							} else {
								// if (alternateToken.matches[altIndex]) { //if not in the initial alternation => look further
								match = handleMatch(alternateToken.matches[altIndex] || maskToken.matches[altIndex], [altIndex].concat(loopNdx), quantifierRecurse);
								// } else match = false;
							}
							if (match) return true;
						} else if (match.isQuantifier && quantifierRecurse !== maskToken.matches[$.inArray(match, maskToken.matches) - 1]) {
							var qt = match;
							for (var qndx = (ndxInitializer.length > 0) ? ndxInitializer.shift() : 0; (qndx < (isNaN(qt.quantifier.max) ? qndx + 1 : qt.quantifier.max)) && testPos <= pos; qndx++) {
								var tokenGroup = maskToken.matches[$.inArray(qt, maskToken.matches) - 1];
								match = handleMatch(tokenGroup, [qndx].concat(loopNdx), tokenGroup); //set the tokenGroup as quantifierRecurse marker
								if (match) {
									//get latest match
									latestMatch = matches[matches.length - 1].match;
									latestMatch.optionalQuantifier = qndx > (qt.quantifier.min - 1);
									if (isFirstMatch(latestMatch, tokenGroup)) { //search for next possible match
										if (qndx > (qt.quantifier.min - 1)) {
											insertStop = true;
											testPos = pos; //match the position after the group
											break; //stop quantifierloop
										} else return true;
									} else {
										return true;
									}
								}
							}
						} else {
							match = resolveTestFromToken(match, ndxInitializer, loopNdx, quantifierRecurse);
							if (match) return true;
						}
					} else testPos++;
				}

				for (var tndx = (ndxInitializer.length > 0 ? ndxInitializer.shift() : 0); tndx < maskToken.matches.length; tndx++) {
					if (maskToken.matches[tndx].isQuantifier !== true) {
						var match = handleMatch(maskToken.matches[tndx], [tndx].concat(loopNdx), quantifierRecurse);
						if (match && testPos === pos) {
							return match;
						} else if (testPos > pos) {
							break;
						}
					}
				}
			}

			function mergeLocators(tests) {
				var locator = [];
				if (!$.isArray(tests)) tests = [tests];

				if (tests[0].alternation === undefined) {
					locator = tests[0].locator.slice();
				}
				else {
					$.each(tests, function (ndx, tst) {
						if (tst.def !== "") {
							if (locator.length === 0) locator = tst.locator.slice();
							else {
								for (var i = 0; i < locator.length; i++) {
									if (tst.locator[i] && locator[i].toString().indexOf(tst.locator[i]) === -1) {
										locator[i] += "," + tst.locator[i];
									}
								}
							}
						}
					});
				}
				return locator;
			}

			function filterTests(tests) {
				if (false && ndxIntlzr !== undefined) {
					var temp = $.map(tests, function (test) {
						var match = true;
						for (var i = 0, ndxtl = tests.length, ndxil = ndxIntlzr ? ndxIntlzr.length : 0; i < ndxil; i++) {
							if ((typeof test.locator[i] === "string" && !checkAlternationMatch(test.locator[i].split(","), ndxIntlzr[i].toString().split(","))) ||
								(typeof test.locator[i] !== "string" && (test.locator[i] < ndxIntlzr[i] && (i !== ndxil - 1 || i !== ndxtl - 1 )))) {
								match = false;
								break;
							}
						}
						if (match) {
							return test;
						}
					});

					if (temp.length == 0) {
						console.log(JSON.stringify(tests));
					}

					return temp;
				}
				return tests;
			}

			if (pos > -1) {
				if (ndxIntlzr === undefined) { //determine index initializer
					var previousPos = pos - 1,
						test;
					while ((test = getMaskSet().validPositions[previousPos] || getMaskSet().tests[previousPos]) === undefined && previousPos > -1) {
						previousPos--;
					}
					if (test !== undefined && previousPos > -1) {
						ndxInitializer = mergeLocators(test);
						cacheDependency = ndxInitializer.join("");
						testPos = previousPos;
					}
				}
				if (getMaskSet().tests[pos] && getMaskSet().tests[pos][0].cd === cacheDependency) { //cacheDependency is set on all tests, just check on the first
					//console.log("cache hit " + pos + " - " + ndxIntlzr);
					return filterTests(getMaskSet().tests[pos]);
				} else {
					//console.log("cache mis " + pos + " - " + ndxIntlzr);
					//if (ndxIntlzr !== undefined) { //initially faster load
					//	testPos = ndxIntlzr ? tstPs : 0;
					//	ndxInitializer = ndxIntlzr || [0];
					//	cacheDependency = ndxIntlzr ? ndxIntlzr.join("") : "";
					//}
				}
				for (var mtndx = ndxInitializer.shift(); mtndx < maskTokens.length; mtndx++) {
					var match = resolveTestFromToken(maskTokens[mtndx], ndxInitializer, [mtndx]);
					if ((match && testPos === pos) || testPos > pos) {
						break;
					}
				}
			}
			if (matches.length === 0 || insertStop) {
				matches.push({
					match: {
						fn: null,
						cardinality: 0,
						optionality: true,
						casing: null,
						def: ""
					},
					locator: [],
					cd: cacheDependency
				});
			}

			getMaskSet().tests[pos] = $.extend(true, [], matches); //set a clone to prevent overwriting some props
			//console.log(pos + " - " + JSON.stringify(matches));
			return getMaskSet().tests[pos];
		}

		function getBufferTemplate() {
			if (getMaskSet()._buffer === undefined) {
				//generate template
				getMaskSet()._buffer = getMaskTemplate(false, 1);
			}
			return getMaskSet()._buffer;
		}

		function getBuffer(noCache) {
			if (getMaskSet().buffer === undefined || noCache === true) {
				if (noCache === true) {
					for (var testNdx in getMaskSet().tests) {
						if (getMaskSet().validPositions[testNdx] === undefined) {
							delete getMaskSet().tests[testNdx];
						}
					}
				}
				getMaskSet().buffer = getMaskTemplate(true, getLastValidPosition(), true);
			}
			return getMaskSet().buffer;
		}

		function refreshFromBuffer(start, end, buffer) {
			var i;
			buffer = buffer;
			if (start === true) {
				resetMaskSet();
				start = 0;
				end = buffer.length;
			} else {
				for (i = start; i < end; i++) {
					delete getMaskSet().validPositions[i];
					delete getMaskSet().tests[i];
				}
			}
			for (i = start; i < end; i++) {
				resetMaskSet(true); //prevents clobber from the buffer
				if (buffer[i] !== opts.skipOptionalPartCharacter) {
					isValid(i, buffer[i], true, true);
				}
			}
		}

		function casing(elem, test, pos) {
			switch (test.casing) {
				case "upper":
					elem = elem.toUpperCase();
					break;
				case "lower":
					elem = elem.toLowerCase();
					break;
				case "title":
					var posBefore = getMaskSet().validPositions[pos - 1];
					if (pos === 0 || posBefore && posBefore.input === String.fromCharCode(Inputmask.keyCode.SPACE)) {
						elem = elem.toUpperCase();
					} else {
						elem = elem.toLowerCase();
					}
					break;
			}

			return elem;
		}

		function checkAlternationMatch(altArr1, altArr2) {
			var altArrC = opts.greedy ? altArr2 : altArr2.slice(0, 1),
				isMatch = false;
			for (var alndx = 0; alndx < altArr1.length; alndx++) {
				if ($.inArray(altArr1[alndx], altArrC) !== -1) {
					isMatch = true;
					break;
				}
			}
			return isMatch;
		}

		function isValid(pos, c, strict, fromSetValid) { //strict true ~ no correction or autofill
			function isSelection(posObj) {
				return isRTL ? (posObj.begin - posObj.end) > 1 || ((posObj.begin - posObj.end) === 1 && opts.insertMode) :
				(posObj.end - posObj.begin) > 1 || ((posObj.end - posObj.begin) === 1 && opts.insertMode);
			}

			strict = strict === true; //always set a value to strict to prevent possible strange behavior in the extensions

			var maskPos = pos;
			if (pos.begin !== undefined) { //position was a position object - used to handle a delete by typing over a selection
				maskPos = isRTL && !isSelection(pos) ? pos.end : pos.begin;
			}

			function _isValid(position, c, strict, fromSetValid) {
				var rslt = false;
				$.each(getTests(position), function (ndx, tst) {
					var test = tst.match;
					var loopend = c ? 1 : 0,
						chrs = "";
					for (var i = test.cardinality; i > loopend; i--) {
						chrs += getBufferElement(position - (i - 1));
					}
					if (c) {
						chrs += c;
					}

					//make sure the buffer is set and correct
					getBuffer(true);
					//return is false or a json object => { pos: ??, c: ??} or true
					rslt = test.fn != null ?
						test.fn.test(chrs, getMaskSet(), position, strict, opts, isSelection(pos)) : (c === test.def || c === opts.skipOptionalPartCharacter) && test.def !== "" ? //non mask
					{
						c: test.placeholder || test.def,
						pos: position
					} : false;

					if (rslt !== false) {
						var elem = rslt.c !== undefined ? rslt.c : c;
						elem = (elem === opts.skipOptionalPartCharacter && test.fn === null) ? (test.placeholder || test.def) : elem;

						var validatedPos = position,
							possibleModifiedBuffer = getBuffer();

						if (rslt.remove !== undefined) { //remove position(s)
							if (!$.isArray(rslt.remove)) rslt.remove = [rslt.remove];
							$.each(rslt.remove.sort(function (a, b) {
								return b - a;
							}), function (ndx, lmnt) {
								stripValidPositions(lmnt, lmnt + 1, true);
							});
						}
						if (rslt.insert !== undefined) { //insert position(s)
							if (!$.isArray(rslt.insert)) rslt.insert = [rslt.insert];
							$.each(rslt.insert.sort(function (a, b) {
								return a - b;
							}), function (ndx, lmnt) {
								isValid(lmnt.pos, lmnt.c, false, fromSetValid);
							});
						}

						if (rslt.refreshFromBuffer) {
							var refresh = rslt.refreshFromBuffer;
							strict = true;
							refreshFromBuffer(refresh === true ? refresh : refresh.start, refresh.end, possibleModifiedBuffer);
							if (rslt.pos === undefined && rslt.c === undefined) {
								rslt.pos = getLastValidPosition();
								return false; //breakout if refreshFromBuffer && nothing to insert
							}
							validatedPos = rslt.pos !== undefined ? rslt.pos : position;
							if (validatedPos !== position) {
								rslt = $.extend(rslt, isValid(validatedPos, elem, true, fromSetValid)); //revalidate new position strict
								return false;
							}

						} else if (rslt !== true && rslt.pos !== undefined && rslt.pos !== position) { //their is a position offset
							validatedPos = rslt.pos;
							refreshFromBuffer(position, validatedPos, getBuffer().slice());
							if (validatedPos !== position) {
								rslt = $.extend(rslt, isValid(validatedPos, elem, true)); //revalidate new position strict
								return false;
							}
						}

						if (rslt !== true && rslt.pos === undefined && rslt.c === undefined) {
							return false; //breakout if nothing to insert
						}

						if (ndx > 0) {
							resetMaskSet(true);
						}

						if (!setValidPosition(validatedPos, $.extend({}, tst, {
								"input": casing(elem, test, validatedPos)
							}), fromSetValid, isSelection(pos))) {
							rslt = false;
						}
						return false; //break from $.each
					}
				});

				return rslt;
			}

			function alternate(pos, c, strict, fromSetValid) {
				var validPsClone = $.extend(true, {}, getMaskSet().validPositions),
					testsClone = $.extend(true, {}, getMaskSet().tests),
					lastAlt,
					alternation,
					isValidRslt,
					altPos, i, validPos;
				//find last modified alternation
				for (var lAlt = getLastValidPosition(); lAlt >= 0; lAlt--) {
					altPos = getMaskSet().validPositions[lAlt];
					if (altPos && altPos.alternation !== undefined) {
						lastAlt = lAlt;
						alternation = getMaskSet().validPositions[lastAlt].alternation;
						if (getTestTemplate(lastAlt).locator[altPos.alternation] !== altPos.locator[altPos.alternation]) {
							break;
						}
					}
				}
				if (alternation !== undefined) {
					//find first decision making position
					lastAlt = parseInt(lastAlt);
					for (var decisionPos in getMaskSet().validPositions) {
						decisionPos = parseInt(decisionPos);
						altPos = getMaskSet().validPositions[decisionPos];
						if (decisionPos >= lastAlt && altPos.alternation !== undefined) {
							var altNdxs;
							if (lastAlt === 0) {
								altNdxs = [];
								$.each(getMaskSet().tests[lastAlt], function (ndx, test) {
									if (test.locator[alternation] !== undefined) {
										altNdxs = altNdxs.concat(test.locator[alternation].toString().split(","));
									}
								});
							} else {
								altNdxs = getMaskSet().validPositions[lastAlt].locator[alternation].toString().split(",");
							}
							var decisionTaker = altPos.locator[alternation] !== undefined ? altPos.locator[alternation] : altNdxs[0]; //no match in the alternations (length mismatch)
							if (decisionTaker.length > 0) { //no decision taken ~ take first one as decider
								decisionTaker = decisionTaker.split(",")[0];
							}

							for (var mndx = 0; mndx < altNdxs.length; mndx++) {
								var validInputs = [],
									staticInputsBeforePos = 0,
									staticInputsBeforePosAlternate = 0;
								if (decisionTaker < altNdxs[mndx]) {
									var possibilityPos, possibilities;
									for (var dp = decisionPos; dp >= 0; dp--) {
										possibilityPos = getMaskSet().validPositions[dp];
										if (possibilityPos !== undefined) {
											var bestMatch = selectBestMatch(dp, altNdxs[mndx]);
											if (getMaskSet().validPositions[dp].match.def !== bestMatch.match.def) {
												if (getMaskSet().validPositions[dp].generatedInput !== true) {
													validInputs.push(getMaskSet().validPositions[dp].input);
												}
												getMaskSet().validPositions[dp] = bestMatch;
												getMaskSet().validPositions[dp].input = getPlaceholder(dp);
												if (getMaskSet().validPositions[dp].match.fn === null) {
													staticInputsBeforePosAlternate++;
												}
												possibilityPos = bestMatch;
											}
											possibilities = possibilityPos.locator[alternation]; //store to reset
											possibilityPos.locator[alternation] = parseInt(altNdxs[mndx]);
											break;
										}
									}
									if (decisionTaker !== possibilityPos.locator[alternation]) {
										for (i = decisionPos + 1; i < getLastValidPosition(undefined, true) + 1; i++) {
											validPos = getMaskSet().validPositions[i];
											if (validPos && validPos.match.fn != null) {
												validInputs.push(validPos.input);
											} else if (i < pos) staticInputsBeforePos++;
											delete getMaskSet().validPositions[i];
											delete getMaskSet().tests[i];
										}
										resetMaskSet(true); //clear getbuffer
										opts.keepStatic = !opts.keepStatic; //disable keepStatic on getMaskLength
										isValidRslt = true;
										while (validInputs.length > 0) {
											var input = validInputs.shift();
											if (input !== opts.skipOptionalPartCharacter) {
												if (!(isValidRslt = isValid(getLastValidPosition(undefined, true) + 1, input, false, fromSetValid))) {
													break;
												}
											}
										}

										possibilityPos.alternation = alternation;
										possibilityPos.locator[alternation] = possibilities; //reset forceddecision ~ needed for proper delete
										if (isValidRslt) {
											var targetLvp = getLastValidPosition(pos) + 1;
											for (i = decisionPos + 1; i < getLastValidPosition() + 1; i++) {
												validPos = getMaskSet().validPositions[i];
												if ((validPos === undefined || validPos.match.fn == null) && i < pos) {
													staticInputsBeforePosAlternate++;
												}
											}
											pos = pos + (staticInputsBeforePosAlternate - staticInputsBeforePos);
											isValidRslt = isValid(pos > targetLvp ? targetLvp : pos, c, strict, fromSetValid);
										}
										opts.keepStatic = !opts.keepStatic; //enable keepStatic on getMaskLength
										if (!isValidRslt) {
											resetMaskSet();
											getMaskSet().validPositions = $.extend(true, {}, validPsClone);
											getMaskSet().tests = $.extend(true, {}, testsClone);
										} else return isValidRslt;
									}
								}
							}
							break;
						}
					}
				}
				return false;
			}

			//set alternator choice on previous skipped placeholder positions
			function trackbackAlternations(originalPos, newPos) {
				var vp = getMaskSet().validPositions[newPos],
					targetLocator = vp.locator,
					tll = targetLocator.length;

				for (var ps = originalPos; ps < newPos; ps++) {
					if (getMaskSet().validPositions[ps] === undefined && !isMask(ps, true)) {
						var tests = getTests(ps),
							bestMatch = tests[0],
							equality = -1;
						$.each(tests, function (ndx, tst) { //find best matching
							for (var i = 0; i < tll; i++) {
								if (tst.locator[i] !== undefined && checkAlternationMatch(tst.locator[i].toString().split(","), targetLocator[i].toString().split(","))) {
									if (equality < i) {
										equality = i;
										bestMatch = tst;
									}
								} else break;
							}
						});
						setValidPosition(ps, $.extend({}, bestMatch, {
							"input": bestMatch.match.placeholder || bestMatch.match.def
						}), true);
					}
				}
			}


			var result = false,
				positionsClone = $.extend(true, {}, getMaskSet().validPositions); //clone the currentPositions

			//Check for a nonmask before the pos
			//find previous valid
			for (var pndx = maskPos - 1; pndx > -1; pndx--) {
				if (getMaskSet().validPositions[pndx]) break;
			}
			////fill missing nonmask and valid placeholders
			var testTemplate, generatedPos;
			for (pndx++; pndx < maskPos; pndx++) {
				if (getMaskSet().validPositions[pndx] === undefined &&
					(opts.jitMasking === false || opts.jitMasking > pndx) &&
					((testTemplate = getTestTemplate(pndx)).match.def === opts.radixPointDefinitionSymbol || !isMask(pndx, true) ||
					($.inArray(opts.radixPoint, getBuffer()) < pndx && testTemplate.match.fn && testTemplate.match.fn.test(getPlaceholder(pndx), getMaskSet(), pndx, false, opts)))) {
					generatedPos = getLastValidPosition(pndx, true) + 1;
					result = _isValid(generatedPos, testTemplate.match.placeholder || (testTemplate.match.fn == null ? testTemplate.match.def : (getPlaceholder(pndx) !== "" ? getPlaceholder(pndx) : getBuffer()[pndx])), true, fromSetValid);
					if (result !== false) {
						getMaskSet().validPositions[result.pos || generatedPos].generatedInput = true;
					}
				}
			}


			if (isSelection(pos)) {
				handleRemove(undefined, Inputmask.keyCode.DELETE, pos);
				maskPos = getMaskSet().p;
			}

			if (maskPos < getMaskSet().maskLength) {
				result = _isValid(maskPos, c, strict, fromSetValid);
				if ((!strict || fromSetValid === true) && result === false) {
					var currentPosValid = getMaskSet().validPositions[maskPos];
					if (currentPosValid && currentPosValid.match.fn === null && (currentPosValid.match.def === c || c === opts.skipOptionalPartCharacter)) {
						result = {
							"caret": seekNext(maskPos)
						};
					} else if ((opts.insertMode || getMaskSet().validPositions[seekNext(maskPos)] === undefined) && !isMask(maskPos, true)) { //does the input match on a further position?
						var staticChar = getTestTemplate(maskPos).match;
						staticChar = staticChar.placeholder || staticChar.def;
						_isValid(maskPos, staticChar, strict, fromSetValid);
						for (var nPos = maskPos + 1, snPos = seekNext(maskPos); nPos <= snPos; nPos++) {
							result = _isValid(nPos, c, strict, fromSetValid);
							if (result !== false) {
								trackbackAlternations(maskPos, nPos);
								maskPos = nPos;
								break;
							}
						}
					}
				}
			}
			if (result === false && opts.keepStatic) { //try fuzzy alternator logic
				result = alternate(maskPos, c, strict, fromSetValid);
			}
			if (result === true) {
				result = {
					"pos": maskPos
				};
			}
			if ($.isFunction(opts.postValidation) && result !== false && !strict && fromSetValid !== true) {
				result = opts.postValidation(getBuffer(true), result, opts) ? result : false;
			}

			if (result.pos === undefined) {
				result.pos = maskPos;
			}

			if (result === false) {
				resetMaskSet(true);
				getMaskSet().validPositions = $.extend(true, {}, positionsClone); //revert validation changes
			}

			return result;
		}

		function isMask(pos, strict) {
			var test;
			if (strict) {
				test = getTestTemplate(pos).match;
				if (test.def === "") test = getTest(pos);
			} else test = getTest(pos);

			if (test.fn != null) {
				return test.fn;
			} else if (strict !== true && pos > -1 && !opts.keepStatic && getMaskSet().validPositions[pos] === undefined) {
				var tests = getTests(pos);
				return tests.length > 2;
			}
			return false;
		}

		function seekNext(pos, newBlock) {
			var maskL = getMaskSet().maskLength;
			if (pos >= maskL) return maskL;
			var position = pos;
			while (++position < maskL && ((newBlock === true && (getTest(position).newBlockMarker !== true || !isMask(position))) || (newBlock !== true && !isMask(position) && (opts.nojumps !== true || opts.nojumpsThreshold > position)))) {
			}
			return position;
		}

		function seekPrevious(pos, newBlock) {
			var position = pos;
			if (position <= 0) return 0;

			while (--position > 0 && ((newBlock === true && getTest(position).newBlockMarker !== true) || (newBlock !== true && !isMask(position)))) {
			}

			return position;
		}

		function getBufferElement(position) {
			return getMaskSet().validPositions[position] === undefined ? getPlaceholder(position) : getMaskSet().validPositions[position].input;
		}

		function writeBuffer(input, buffer, caretPos, event, triggerInputEvent) {
			if (event && $.isFunction(opts.onBeforeWrite)) {
				var result = opts.onBeforeWrite(event, buffer, caretPos, opts);
				if (result) {
					if (result.refreshFromBuffer) {
						var refresh = result.refreshFromBuffer;
						refreshFromBuffer(refresh === true ? refresh : refresh.start, refresh.end, result.buffer || buffer);
						buffer = getBuffer(true);
					}
					//only alter when intented !== undefined
					if (caretPos !== undefined) caretPos = result.caret !== undefined ? result.caret : caretPos;
				}
			}
			input.inputmask._valueSet(buffer.join(""));
			if (caretPos !== undefined && (event === undefined || event.type !== "blur")) {
				caret(input, caretPos);
			}
			if (triggerInputEvent === true) {
				skipInputEvent = true;
				$(input).trigger("input");
			}
		}

		function getPlaceholder(pos, test) {
			test = test || getTest(pos);
			if (test.placeholder !== undefined) {
				return test.placeholder;
			} else if (test.fn === null) {
				if (pos > -1 && !opts.keepStatic && getMaskSet().validPositions[pos] === undefined) {
					var tests = getTests(pos),
						staticAlternations = [],
						prevTest;
					if (tests.length > 2) {
						for (var i = 0; i < tests.length; i++) {
							if (tests[i].match.optionality !== true && tests[i].match.optionalQuantifier !== true &&
								(tests[i].match.fn === null || (prevTest === undefined || tests[i].match.fn.test(prevTest.match.def, getMaskSet(), pos, true, opts) !== false))) {
								staticAlternations.push(tests[i]);
								if (tests[i].match.fn === null) prevTest = tests[i];
								if (staticAlternations.length > 1) return opts.placeholder.charAt(pos % opts.placeholder.length);
							}
						}
					}
				}
				return test.def;
			}
			return opts.placeholder.charAt(pos % opts.placeholder.length);
		}

		function checkVal(input, writeOut, strict, nptvl) {
			var inputValue = nptvl.slice(),
				charCodes = "",
				initialNdx = 0, result;

			function isTemplateMatch() {
				var isMatch = false;
				var charCodeNdx = getBufferTemplate().slice(initialNdx, seekNext(initialNdx)).join("").indexOf(charCodes);
				if (charCodeNdx !== -1 && !isMask(initialNdx)) {
					isMatch = true;
					var bufferTemplateArr = getBufferTemplate().slice(initialNdx, initialNdx + charCodeNdx);
					for (var i = 0; i < bufferTemplateArr.length; i++) {
						if (bufferTemplateArr[i] !== " ") {
							isMatch = false;
							break;
						}
					}
				}

				return isMatch;
			}

			resetMaskSet();
			getMaskSet().p = seekNext(-1);
			// if (writeOut) input.inputmask._valueSet(""); //initial clear

			if (!strict) {
				if (opts.autoUnmask !== true) {
					var staticInput = getBufferTemplate().slice(0, seekNext(-1)).join(""),
						matches = inputValue.join("").match(new RegExp("^" + Inputmask.escapeRegex(staticInput), "g"));
					if (matches && matches.length > 0) {
						inputValue.splice(0, matches.length * staticInput.length);
						initialNdx = seekNext(initialNdx);
					}
				} else {
					initialNdx = seekNext(initialNdx);
				}
			}


			$.each(inputValue, function (ndx, charCode) {
				if (charCode !== undefined) { //inputfallback strips some elements out of the inputarray.  $.each logically presents them as undefined
					var keypress = new $.Event("keypress");
					keypress.which = charCode.charCodeAt(0);
					charCodes += charCode;
					var lvp = getLastValidPosition(undefined, true),
						lvTest = getMaskSet().validPositions[lvp],
						nextTest = getTestTemplate(lvp + 1, lvTest ? lvTest.locator.slice() : undefined, lvp);
					if (!isTemplateMatch() || strict || opts.autoUnmask) {
						var pos = strict ? ndx : (nextTest.match.fn == null && nextTest.match.optionality && (lvp + 1) < getMaskSet().p ? lvp + 1 : getMaskSet().p);
						result = keypressEvent.call(input, keypress, true, false, strict, pos);
						initialNdx = pos + 1;
						charCodes = "";
					} else {
						result = keypressEvent.call(input, keypress, true, false, true, lvp + 1);
					}
					if (!strict && $.isFunction(opts.onBeforeWrite)) {
						result = opts.onBeforeWrite(keypress, getBuffer(), result.forwardPosition, opts);
						if (result && result.refreshFromBuffer) {
							var refresh = result.refreshFromBuffer;
							refreshFromBuffer(refresh === true ? refresh : refresh.start, refresh.end, result.buffer);
							resetMaskSet(true);
							if (result.caret) {
								getMaskSet().p = result.caret;
							}
						}
					}
				}
			});
			if (writeOut) {
				writeBuffer(input, getBuffer(), document.activeElement === input ? seekNext(getLastValidPosition(0)) : undefined, new $.Event("checkval"));
			}
		}

		function unmaskedvalue(input) {
			if (input && input.inputmask === undefined) {
				return input.value;
			}

			var umValue = [],
				vps = getMaskSet().validPositions;
			for (var pndx in vps) {
				if (vps[pndx].match && vps[pndx].match.fn != null) {
					umValue.push(vps[pndx].input);
				}
			}
			var unmaskedValue = umValue.length === 0 ? "" : (isRTL ? umValue.reverse() : umValue).join("");
			if ($.isFunction(opts.onUnMask)) {
				var bufferValue = (isRTL ? getBuffer().slice().reverse() : getBuffer()).join("");
				unmaskedValue = (opts.onUnMask(bufferValue, unmaskedValue, opts) || unmaskedValue);
			}
			return unmaskedValue;
		}

		function caret(input, begin, end, notranslate) {
			function translatePosition(pos) {
				if (notranslate !== true && isRTL && typeof pos === "number" && (!opts.greedy || opts.placeholder !== "")) {
					var bffrLght = getBuffer().join("").length; //join is needed because sometimes we get an empty buffer element which must not be counted for the caret position (numeric alias)
					pos = bffrLght - pos;
				}
				return pos;
			}

			var range;
			if (typeof begin === "number") {
				begin = translatePosition(begin);
				end = translatePosition(end);
				end = (typeof end == "number") ? end : begin;
				// if (!$(input).is(":visible")) {
				// 	return;
				// }

				var scrollCalc = parseInt(((input.ownerDocument.defaultView || window).getComputedStyle ? (input.ownerDocument.defaultView || window).getComputedStyle(input, null) : input.currentStyle).fontSize) * end;
				input.scrollLeft = scrollCalc > input.scrollWidth ? scrollCalc : 0;

				if (!mobile && opts.insertMode === false && begin === end) end++; //set visualization for insert/overwrite mode
				if (input.setSelectionRange) {
					input.selectionStart = begin;
					input.selectionEnd = end;
				} else if (window.getSelection) {
					range = document.createRange();
					if (input.firstChild === undefined || input.firstChild === null) {
						var textNode = document.createTextNode("");
						input.appendChild(textNode);
					}
					range.setStart(input.firstChild, begin < input.inputmask._valueGet().length ? begin : input.inputmask._valueGet().length);
					range.setEnd(input.firstChild, end < input.inputmask._valueGet().length ? end : input.inputmask._valueGet().length);
					range.collapse(true);
					var sel = window.getSelection();
					sel.removeAllRanges();
					sel.addRange(range);
					//input.focus();
				} else if (input.createTextRange) {
					range = input.createTextRange();
					range.collapse(true);
					range.moveEnd("character", end);
					range.moveStart("character", begin);
					range.select();

				}
			} else {
				if (input.setSelectionRange) {
					begin = input.selectionStart;
					end = input.selectionEnd;
				} else if (window.getSelection) {
					range = window.getSelection().getRangeAt(0);
					if (range.commonAncestorContainer.parentNode === input || range.commonAncestorContainer === input) {
						begin = range.startOffset;
						end = range.endOffset;
					}
				} else if (document.selection && document.selection.createRange) {
					range = document.selection.createRange();
					begin = 0 - range.duplicate().moveStart("character", -input.inputmask._valueGet().length);
					end = begin + range.text.length;
				}
				/*eslint-disable consistent-return */
				return {
					"begin": translatePosition(begin),
					"end": translatePosition(end)
				};
				/*eslint-enable consistent-return */
			}
		}

		function determineLastRequiredPosition(returnDefinition) {
			var buffer = getBuffer(),
				bl = buffer.length,
				pos, lvp = getLastValidPosition(),
				positions = {},
				lvTest = getMaskSet().validPositions[lvp],
				ndxIntlzr = lvTest !== undefined ? lvTest.locator.slice() : undefined,
				testPos;
			for (pos = lvp + 1; pos < buffer.length; pos++) {
				testPos = getTestTemplate(pos, ndxIntlzr, pos - 1);
				ndxIntlzr = testPos.locator.slice();
				positions[pos] = $.extend(true, {}, testPos);
			}

			var lvTestAlt = lvTest && lvTest.alternation !== undefined ? lvTest.locator[lvTest.alternation] : undefined;
			for (pos = bl - 1; pos > lvp; pos--) {
				testPos = positions[pos];
				if ((testPos.match.optionality ||
					testPos.match.optionalQuantifier ||
					(lvTestAlt && ((lvTestAlt !== positions[pos].locator[lvTest.alternation] && testPos.match.fn != null) ||
					(testPos.match.fn === null && testPos.locator[lvTest.alternation] && checkAlternationMatch(testPos.locator[lvTest.alternation].toString().split(","), lvTestAlt.toString().split(",")) && getTests(pos)[0].def !== "")))) && buffer[pos] === getPlaceholder(pos, testPos.match)) {
					bl--;
				} else break;
			}
			return returnDefinition ? {
				"l": bl,
				"def": positions[bl] ? positions[bl].match : undefined
			} : bl;
		}

		function clearOptionalTail(buffer) {
			var rl = determineLastRequiredPosition(),
				lmib = buffer.length - 1;
			for (; lmib > rl; lmib--) {
				if (isMask(lmib)) break; //fixme ismask is not good enough
			}
			buffer.splice(rl, lmib + 1 - rl);

			return buffer;
		}

		function isComplete(buffer) { //return true / false / undefined (repeat *)
			if ($.isFunction(opts.isComplete)) return opts.isComplete(buffer, opts);
			if (opts.repeat === "*") return undefined;
			var complete = false,
				lrp = determineLastRequiredPosition(true),
				aml = seekPrevious(lrp.l);

			if (lrp.def === undefined || lrp.def.newBlockMarker || lrp.def.optionality || lrp.def.optionalQuantifier) {
				complete = true;
				for (var i = 0; i <= aml; i++) {
					var test = getTestTemplate(i).match;
					if ((test.fn !== null && getMaskSet().validPositions[i] === undefined && test.optionality !== true && test.optionalQuantifier !== true) || (test.fn === null && buffer[i] !== getPlaceholder(i, test))) {
						complete = false;
						break;
					}
				}
			}
			return complete;
		}

		var EventRuler = {
			on: function (input, eventName, eventHandler) {
				var ev = function (e) {
					// console.log("triggered " + e.type);
					if (this.inputmask === undefined && this.nodeName !== "FORM") { //happens when cloning an object with jquery.clone
						var imOpts = $.data(this, "_inputmask_opts");
						if (imOpts)(new Inputmask(imOpts)).mask(this);
						else EventRuler.off(this);
					} else if (e.type !== "setvalue" && (this.disabled || (this.readOnly && !(e.type === "keydown" && (e.ctrlKey && e.keyCode === 67) || (opts.tabThrough === false && e.keyCode === Inputmask.keyCode.TAB))))) {
						e.preventDefault();
					} else {
						switch (e.type) {
							case "input":
								if (skipInputEvent === true) {
									skipInputEvent = false;
									return e.preventDefault();
								}
								break;
							case "keydown":
								//Safari 5.1.x - modal dialog fires keypress twice workaround
								skipKeyPressEvent = false;
								skipInputEvent = false;
								break;
							case "keypress":
								if (skipKeyPressEvent === true) {
									return e.preventDefault();
								}
								skipKeyPressEvent = true;
								break;
							case "click":
								if (iemobile) {
									var that = this;
									setTimeout(function () {
										eventHandler.apply(that, arguments);
									}, 0);
									return false;
								}
								break;
						}
						// console.log("executed " + e.type);
						var returnVal = eventHandler.apply(this, arguments);
						if (returnVal === false) {
							e.preventDefault();
							e.stopPropagation();
						}
						return returnVal;
					}
				};
				//keep instance of the event
				input.inputmask.events[eventName] = input.inputmask.events[eventName] || [];
				input.inputmask.events[eventName].push(ev);

				if ($.inArray(eventName, ["submit", "reset"]) !== -1) {
					if (input.form != null) $(input.form).on(eventName, ev);
				} else {
					$(input).on(eventName, ev);
				}
			},
			off: function (input, event) {
				if (input.inputmask && input.inputmask.events) {
					var events;
					if (event) {
						events = [];
						events[event] = input.inputmask.events[event];
					} else {
						events = input.inputmask.events;
					}
					$.each(events, function (eventName, evArr) {
						while (evArr.length > 0) {
							var ev = evArr.pop();
							if ($.inArray(eventName, ["submit", "reset"]) !== -1) {
								if (input.form != null) $(input.form).off(eventName, ev);
							} else {
								$(input).off(eventName, ev);
							}
						}
						delete input.inputmask.events[eventName];
					});
				}
			}
		};

		function patchValueProperty(npt) {
			var valueGet;
			var valueSet;

			function patchValhook(type) {
				if ($.valHooks && ($.valHooks[type] === undefined || $.valHooks[type].inputmaskpatch !== true)) {
					var valhookGet = $.valHooks[type] && $.valHooks[type].get ? $.valHooks[type].get : function (elem) {
						return elem.value;
					};
					var valhookSet = $.valHooks[type] && $.valHooks[type].set ? $.valHooks[type].set : function (elem, value) {
						elem.value = value;
						return elem;
					};

					$.valHooks[type] = {
						get: function (elem) {
							if (elem.inputmask) {
								if (elem.inputmask.opts.autoUnmask) {
									return elem.inputmask.unmaskedvalue();
								} else {
									var result = valhookGet(elem);
									return getLastValidPosition(undefined, undefined, elem.inputmask.maskset.validPositions) !== -1 || opts.nullable !== true ? result : "";
								}
							} else return valhookGet(elem);
						},
						set: function (elem, value) {
							var $elem = $(elem),
								result;
							result = valhookSet(elem, value);
							if (elem.inputmask) {
								$elem.trigger("setvalue");
							}
							return result;
						},
						inputmaskpatch: true
					};
				}
			}

			function getter() {
				if (this.inputmask) {
					return this.inputmask.opts.autoUnmask ?
						this.inputmask.unmaskedvalue() :
						(getLastValidPosition() !== -1 || opts.nullable !== true ?
							(document.activeElement === this && opts.clearMaskOnLostFocus ?
								(isRTL ? clearOptionalTail(getBuffer().slice()).reverse() : clearOptionalTail(getBuffer().slice())).join("") :
								valueGet.call(this)) :
							"");
				} else return valueGet.call(this);
			}

			function setter(value) {
				valueSet.call(this, value);
				if (this.inputmask) {
					$(this).trigger("setvalue");
				}
			}

			function installNativeValueSetFallback(npt) {
				EventRuler.on(npt, "mouseenter", function (event) {
					var $input = $(this),
						input = this,
						value = input.inputmask._valueGet();
					if (value !== getBuffer().join("") /*&& getLastValidPosition() > 0*/) {
						$input.trigger("setvalue");
					}
				});
			}

			if (!npt.inputmask.__valueGet) {
				if (Object.getOwnPropertyDescriptor) {
					if (typeof Object.getPrototypeOf !== "function") {
						Object.getPrototypeOf = typeof "test".__proto__ === "object" ? function (object) {
							return object.__proto__;
						} : function (object) {
							return object.constructor.prototype;
						};
					}

					var valueProperty = Object.getPrototypeOf ? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(npt), "value") : undefined;
					if (valueProperty && valueProperty.get && valueProperty.set) {
						valueGet = valueProperty.get;
						valueSet = valueProperty.set;
						Object.defineProperty(npt, "value", {
							get: getter,
							set: setter,
							configurable: true
						});
					} else if (npt.tagName !== "INPUT") {
						valueGet = function () {
							return this.textContent;
						};
						valueSet = function (value) {
							this.textContent = value;
						};
						Object.defineProperty(npt, "value", {
							get: getter,
							set: setter,
							configurable: true
						});
					}
				} else if (document.__lookupGetter__ && npt.__lookupGetter__("value")) {
					valueGet = npt.__lookupGetter__("value");
					valueSet = npt.__lookupSetter__("value");

					npt.__defineGetter__("value", getter);
					npt.__defineSetter__("value", setter);
				}
				npt.inputmask.__valueGet = valueGet; //store native property getter
				npt.inputmask._valueGet = function (overruleRTL) {
					return isRTL && overruleRTL !== true ? valueGet.call(this.el).split("").reverse().join("") : valueGet.call(this.el);
				};
				npt.inputmask.__valueSet = valueSet; //store native property setter
				npt.inputmask._valueSet = function (value, overruleRTL) { //null check is needed for IE8 => otherwise converts to "null"
					valueSet.call(this.el, (value === null || value === undefined) ? "" : ((overruleRTL !== true && isRTL) ? value.split("").reverse().join("") : value));
				};

				if (valueGet === undefined) { //jquery.val fallback
					valueGet = function () {
						return this.value;
					};
					valueSet = function (value) {
						this.value = value;
					};
					patchValhook(npt.type);
					installNativeValueSetFallback(npt);
				}
			}
		}

		function handleRemove(input, k, pos, strict) {
			function generalize() {
				if (opts.keepStatic) {
					resetMaskSet(true);
					var validInputs = [],
						lastAlt, positionsClone = $.extend(true, {}, getMaskSet().validPositions);
					//find last alternation
					for (lastAlt = getLastValidPosition(); lastAlt >= 0; lastAlt--) {
						var validPos = getMaskSet().validPositions[lastAlt];
						if (validPos) {
							if (validPos.match.fn != null) {
								validInputs.push(validPos.input);
							}
							delete getMaskSet().validPositions[lastAlt];
							if (validPos.alternation !== undefined && validPos.locator[validPos.alternation] === getTestTemplate(lastAlt).locator[validPos.alternation]) {
								break;
							}
						}
					}

					if (lastAlt > -1) {
						while (validInputs.length > 0) {
							getMaskSet().p = seekNext(getLastValidPosition());
							var keypress = new $.Event("keypress");
							keypress.which = validInputs.pop().charCodeAt(0);
							keypressEvent.call(input, keypress, true, false, false, getMaskSet().p);
						}
					} else getMaskSet().validPositions = $.extend(true, {}, positionsClone); //restore original positions

				}
			}

			if (opts.numericInput || isRTL) {
				if (k === Inputmask.keyCode.BACKSPACE) {
					k = Inputmask.keyCode.DELETE;
				} else if (k === Inputmask.keyCode.DELETE) {
					k = Inputmask.keyCode.BACKSPACE;
				}

				if (isRTL) {
					var pend = pos.end;
					pos.end = pos.begin;
					pos.begin = pend;
				}
			}

			if (k === Inputmask.keyCode.BACKSPACE && (pos.end - pos.begin < 1 || opts.insertMode === false)) {
				pos.begin = seekPrevious(pos.begin);
				if (getMaskSet().validPositions[pos.begin] !== undefined && (getMaskSet().validPositions[pos.begin].input === opts.groupSeparator || getMaskSet().validPositions[pos.begin].input === opts.radixPoint)) {
					pos.begin--;
				}
			} else if (k === Inputmask.keyCode.DELETE && pos.begin === pos.end) {
				pos.end = isMask(pos.end) ? pos.end + 1 : seekNext(pos.end) + 1;
				if (getMaskSet().validPositions[pos.begin] !== undefined && (getMaskSet().validPositions[pos.begin].input === opts.groupSeparator || getMaskSet().validPositions[pos.begin].input === opts.radixPoint)) {
					pos.end++;
				}
			}

			stripValidPositions(pos.begin, pos.end, false, strict);
			if (strict !== true) {
				generalize(); //revert the alternation
			}
			var lvp = getLastValidPosition(pos.begin);
			if (lvp < pos.begin) {
				if (lvp === -1) resetMaskSet();
				getMaskSet().p = seekNext(lvp);
			} else if (strict !== true) {
				getMaskSet().p = pos.begin;
			}
		}

		function keydownEvent(e) {
			var input = this,
				$input = $(input),
				k = e.keyCode,
				pos = caret(input);

			//backspace, delete, and escape get special treatment
			if (k === Inputmask.keyCode.BACKSPACE || k === Inputmask.keyCode.DELETE || (iphone && k === Inputmask.keyCode.BACKSPACE_SAFARI) || (e.ctrlKey && k === Inputmask.keyCode.X && !isInputEventSupported("cut"))) { //backspace/delete
				e.preventDefault(); //stop default action but allow propagation
				handleRemove(input, k, pos);
				writeBuffer(input, getBuffer(), getMaskSet().p, e, undoValue !== getBuffer().join(""));
				if (input.inputmask._valueGet() === getBufferTemplate().join("")) {
					$input.trigger("cleared");
				} else if (isComplete(getBuffer()) === true) {
					$input.trigger("complete");
				}
				if (opts.showTooltip) { //update tooltip
					input.title = opts.tooltip || getMaskSet().mask;
				}
			} else if (k === Inputmask.keyCode.END || k === Inputmask.keyCode.PAGE_DOWN) { //when END or PAGE_DOWN pressed set position at lastmatch
				e.preventDefault();
				var caretPos = seekNext(getLastValidPosition());
				if (!opts.insertMode && caretPos === getMaskSet().maskLength && !e.shiftKey) caretPos--;
				caret(input, e.shiftKey ? pos.begin : caretPos, caretPos, true);
			} else if ((k === Inputmask.keyCode.HOME && !e.shiftKey) || k === Inputmask.keyCode.PAGE_UP) { //Home or page_up
				e.preventDefault();
				caret(input, 0, e.shiftKey ? pos.begin : 0, true);
			} else if (((opts.undoOnEscape && k === Inputmask.keyCode.ESCAPE) || (k === 90 && e.ctrlKey)) && e.altKey !== true) { //escape && undo && #762
				checkVal(input, true, false, undoValue.split(""));
				$input.trigger("click");
			} else if (k === Inputmask.keyCode.INSERT && !(e.shiftKey || e.ctrlKey)) { //insert
				opts.insertMode = !opts.insertMode;
				caret(input, !opts.insertMode && pos.begin === getMaskSet().maskLength ? pos.begin - 1 : pos.begin);
			} else if (opts.tabThrough === true && k === Inputmask.keyCode.TAB) {
				if (e.shiftKey === true) {
					if (getTest(pos.begin).fn === null) {
						pos.begin = seekNext(pos.begin);
					}
					pos.end = seekPrevious(pos.begin, true);
					pos.begin = seekPrevious(pos.end, true);
				} else {
					pos.begin = seekNext(pos.begin, true);
					pos.end = seekNext(pos.begin, true);
					if (pos.end < getMaskSet().maskLength) pos.end--;
				}
				if (pos.begin < getMaskSet().maskLength) {
					e.preventDefault();
					caret(input, pos.begin, pos.end);
				}
			} else if (opts.insertMode === false && !e.shiftKey) {
				if (k === Inputmask.keyCode.RIGHT) {
					setTimeout(function () {
						var caretPos = caret(input);
						caret(input, caretPos.begin);
					}, 0);
				} else if (k === Inputmask.keyCode.LEFT) {
					setTimeout(function () {
						var caretPos = caret(input);
						caret(input, isRTL ? caretPos.begin + 1 : caretPos.begin - 1);
					}, 0);
				}
			}
			opts.onKeyDown.call(this, e, getBuffer(), caret(input).begin, opts);
			ignorable = $.inArray(k, opts.ignorables) !== -1;
		}

		function keypressEvent(e, checkval, writeOut, strict, ndx) {
			var input = this,
				$input = $(input),
				k = e.which || e.charCode || e.keyCode;

			if (checkval !== true && (!(e.ctrlKey && e.altKey) && (e.ctrlKey || e.metaKey || ignorable))) {
				if (k === Inputmask.keyCode.ENTER && undoValue !== getBuffer().join("")) {
					undoValue = getBuffer().join("");
					// e.preventDefault();
					setTimeout(function () {
						$input.trigger("change");
					}, 0);
				}
				return true;
			} else {
				if (k) {
					//special treat the decimal separator
					if (k === 46 && e.shiftKey === false && opts.radixPoint === ",") k = 44;
					var pos = checkval ? {
							begin: ndx,
							end: ndx
						} : caret(input),
						forwardPosition, c = String.fromCharCode(k);

					getMaskSet().writeOutBuffer = true;
					var valResult = isValid(pos, c, strict);
					if (valResult !== false) {
						var p = valResult.pos; //set new position from isValid
						resetMaskSet(true);
						if (valResult.caret !== undefined) {
							forwardPosition = valResult.caret;
						} else {
							var vps = getMaskSet().validPositions;
							if (!opts.keepStatic && (vps[p + 1] !== undefined && getTests(p + 1, vps[p].locator.slice(), p).length > 1 || vps[p].alternation !== undefined)) {
								forwardPosition = p + 1;
							} else forwardPosition = seekNext(p);
						}
						getMaskSet().p = forwardPosition; //needed for checkval
					}

					if (writeOut !== false) {
						var self = this;
						setTimeout(function () {
							opts.onKeyValidation.call(self, k, valResult, opts);
						}, 0);
						if (getMaskSet().writeOutBuffer && valResult !== false) {
							var buffer = getBuffer();
							writeBuffer(input, buffer, (opts.numericInput && valResult.caret === undefined) ? seekPrevious(forwardPosition) : forwardPosition, e, checkval !== true);
							if (checkval !== true) {
								setTimeout(function () { //timeout needed for IE
									if (isComplete(buffer) === true) $input.trigger("complete");
								}, 0);
							}
						}
					}

					if (opts.showTooltip) { //update tooltip
						input.title = opts.tooltip || getMaskSet().mask;
					}

					e.preventDefault();

					if (checkval) {
						valResult.forwardPosition = forwardPosition;
						return valResult;
					}
				}
			}
		}

		function pasteEvent(e) {
			var input = this,
				ev = e.originalEvent || e,
				$input = $(input),
				inputValue = input.inputmask._valueGet(true),
				caretPos = caret(input),
				tempValue;

			if (isRTL) {
				tempValue = caretPos.end;
				caretPos.end = caretPos.begin;
				caretPos.begin = tempValue;
			}

			var valueBeforeCaret = inputValue.substr(0, caretPos.begin),
				valueAfterCaret = inputValue.substr(caretPos.end, inputValue.length);

			if (valueBeforeCaret === (isRTL ? getBufferTemplate().reverse() : getBufferTemplate()).slice(0, caretPos.begin).join("")) valueBeforeCaret = "";
			if (valueAfterCaret === (isRTL ? getBufferTemplate().reverse() : getBufferTemplate()).slice(caretPos.end).join("")) valueAfterCaret = "";
			if (isRTL) {
				tempValue = valueBeforeCaret;
				valueBeforeCaret = valueAfterCaret;
				valueAfterCaret = tempValue;
			}

			if (window.clipboardData && window.clipboardData.getData) { // IE
				inputValue = valueBeforeCaret + window.clipboardData.getData("Text") + valueAfterCaret;
			} else if (ev.clipboardData && ev.clipboardData.getData) {
				inputValue = valueBeforeCaret + ev.clipboardData.getData("text/plain") + valueAfterCaret;
			}

			var pasteValue = inputValue;
			if ($.isFunction(opts.onBeforePaste)) {
				pasteValue = opts.onBeforePaste(inputValue, opts);
				if (pasteValue === false) {
					return e.preventDefault();
				}
				if (!pasteValue) {
					pasteValue = inputValue;
				}
			}
			checkVal(input, false, false, isRTL ? pasteValue.split("").reverse() : pasteValue.toString().split(""));
			writeBuffer(input, getBuffer(), seekNext(getLastValidPosition()), e, true);
			if (isComplete(getBuffer()) === true) {
				$input.trigger("complete");
			}

			return e.preventDefault();
		}

		function inputFallBackEvent(e) { //fallback when keypress fails
			var input = this,
				inputValue = input.inputmask._valueGet();

			if (getBuffer().join("") !== inputValue) {
				var caretPos = caret(input);
				inputValue = inputValue.replace(new RegExp("(" + Inputmask.escapeRegex(getBufferTemplate().join("")) + ")*"), "");

				if (iemobile) { //iemobile just set the character at the end althought the caret position is correctly set
					var inputChar = inputValue.replace(getBuffer().join(""), "");
					if (inputChar.length === 1) {
						var keypress = new $.Event("keypress");
						keypress.which = inputChar.charCodeAt(0);
						keypressEvent.call(input, keypress, true, true, false, getMaskSet().validPositions[caretPos.begin - 1] ? caretPos.begin : caretPos.begin - 1);
						return false;
					}
				}

				if (caretPos.begin > inputValue.length) {
					caret(input, inputValue.length);
					caretPos = caret(input);
				}
				//detect & treat possible backspace
				if ((getBuffer().length - inputValue.length) === 1 && inputValue.charAt(caretPos.begin) !== getBuffer()[caretPos.begin] && inputValue.charAt(caretPos.begin + 1) !== getBuffer()[caretPos.begin] && !isMask(caretPos.begin)) {
					e.keyCode = Inputmask.keyCode.BACKSPACE;
					keydownEvent.call(input, e);
				} else {
					var lvp = getLastValidPosition() + 1;
					var bufferTemplate = getBuffer().slice(lvp).join('');
					while (inputValue.match(Inputmask.escapeRegex(bufferTemplate) + "$") === null) {
						bufferTemplate = bufferTemplate.slice(1);
					}
					inputValue = inputValue.replace(bufferTemplate, "");
					inputValue = inputValue.split("");

					checkVal(input, true, false, inputValue);

					if (isComplete(getBuffer()) === true) {
						$(input).trigger("complete");
					}
				}
				e.preventDefault();
			}
		}

		function setValueEvent(e) {
			var input = this,
				value = input.inputmask._valueGet();
			checkVal(input, true, false, ($.isFunction(opts.onBeforeMask) ? (opts.onBeforeMask(value, opts) || value) : value).split(""));
			undoValue = getBuffer().join("");
			if ((opts.clearMaskOnLostFocus || opts.clearIncomplete) && input.inputmask._valueGet() === getBufferTemplate().join("")) {
				input.inputmask._valueSet("");
			}
		}

		function focusEvent(e) {
			var input = this,
				nptValue = input.inputmask._valueGet();
			if (opts.showMaskOnFocus && (!opts.showMaskOnHover || (opts.showMaskOnHover && nptValue === ""))) {
				if (input.inputmask._valueGet() !== getBuffer().join("")) {
					writeBuffer(input, getBuffer(), seekNext(getLastValidPosition()));
				}
			} else if (mouseEnter === false) { //only executed on focus without mouseenter
				caret(input, seekNext(getLastValidPosition()));
			}
			if (opts.positionCaretOnTab === true) {
				setTimeout(function () {
					caret(input, seekNext(getLastValidPosition()));
				}, 0);
			}
			undoValue = getBuffer().join("");
		}

		function mouseleaveEvent(e) {
			var input = this;
			mouseEnter = false;
			if (opts.clearMaskOnLostFocus && document.activeElement !== input) {
				var buffer = getBuffer().slice(),
					nptValue = input.inputmask._valueGet();
				if (nptValue !== input.getAttribute("placeholder") && nptValue !== "") {
					if (getLastValidPosition() === -1 && nptValue === getBufferTemplate().join("")) {
						buffer = [];
					} else { //clearout optional tail of the mask
						clearOptionalTail(buffer);
					}
					writeBuffer(input, buffer);
				}
			}
		}

		function clickEvent(e) {
			function doRadixFocus(clickPos) {
				if (opts.radixPoint !== "") {
					var vps = getMaskSet().validPositions;
					if (vps[clickPos] === undefined || (vps[clickPos].input === getPlaceholder(clickPos))) {
						if (clickPos < seekNext(-1)) return true;
						var radixPos = $.inArray(opts.radixPoint, getBuffer());
						if (radixPos !== -1) {
							for (var vp in vps) {
								if (radixPos < vp && vps[vp].input !== getPlaceholder(vp)) {
									return false;
								}
							}
							return true;
						}
					}
				}
				return false;
			}

			var input = this;
			setTimeout(function () { //needed for Chrome ~ initial selection clears after the clickevent
				if (document.activeElement === input) {
					var selectedCaret = caret(input);
					if (selectedCaret.begin === selectedCaret.end) {
						switch (opts.positionCaretOnClick) {
							case "none":
								break;
							case "radixFocus":
								if (doRadixFocus(selectedCaret.begin)) {
									caret(input, opts.numericInput ? seekNext($.inArray(opts.radixPoint, getBuffer())) : $.inArray(opts.radixPoint, getBuffer()));
									break;
								}
							default: //lvp:
								var clickPosition = selectedCaret.begin,
									lvclickPosition = getLastValidPosition(clickPosition, true),
									lastPosition = seekNext(lvclickPosition);

								if (clickPosition < lastPosition) {
									caret(input, !isMask(clickPosition) && !isMask(clickPosition - 1) ? seekNext(clickPosition) : clickPosition);
								} else {
									var placeholder = getPlaceholder(lastPosition);
									if ((placeholder !== "" && getBuffer()[lastPosition] !== placeholder) || (!isMask(lastPosition, true) && getTest(lastPosition).def === placeholder)) {
										lastPosition = seekNext(lastPosition);
									}
									caret(input, lastPosition);
								}
								break;
						}
					}
				}
			}, 0);
		}

		function dblclickEvent(e) {
			var input = this;
			setTimeout(function () {
				caret(input, 0, seekNext(getLastValidPosition()));
			}, 0);
		}

		function cutEvent(e) {
			var input = this,
				$input = $(input),
				pos = caret(input),
				ev = e.originalEvent || e;

			//correct clipboardData
			var clipboardData = window.clipboardData || ev.clipboardData,
				clipData = isRTL ? getBuffer().slice(pos.end, pos.begin) : getBuffer().slice(pos.begin, pos.end);
			clipboardData.setData("text", isRTL ? clipData.reverse().join("") : clipData.join(""));
			if (document.execCommand) document.execCommand("copy"); // copy selected content to system clipbaord

			handleRemove(input, Inputmask.keyCode.DELETE, pos);
			writeBuffer(input, getBuffer(), getMaskSet().p, e, undoValue !== getBuffer().join(""));

			if (input.inputmask._valueGet() === getBufferTemplate().join("")) {
				$input.trigger("cleared");
			}

			if (opts.showTooltip) { //update tooltip
				input.title = opts.tooltip || getMaskSet().mask;
			}
		}

		function blurEvent(e) {
			var $input = $(this),
				input = this;
			if (input.inputmask) {
				var nptValue = input.inputmask._valueGet(),
					buffer = getBuffer().slice();
				if (undoValue !== buffer.join("")) {
					setTimeout(function () { //change event should be triggered after the other buffer manipulations on blur
						$input.trigger("change");
						undoValue = buffer.join("");
					}, 0);
				}
				if (nptValue !== "") {
					if (opts.clearMaskOnLostFocus) {
						if (getLastValidPosition() === -1 && nptValue === getBufferTemplate().join("")) {
							buffer = [];
						} else { //clearout optional tail of the mask
							clearOptionalTail(buffer);
						}
					}
					if (isComplete(buffer) === false) {
						setTimeout(function () {
							$input.trigger("incomplete");
						}, 0);
						if (opts.clearIncomplete) {
							resetMaskSet();
							if (opts.clearMaskOnLostFocus) {
								buffer = [];
							} else {
								buffer = getBufferTemplate().slice();
							}
						}
					}

					writeBuffer(input, buffer, undefined, e);
				}
			}
		}

		function mouseenterEvent(e) {
			var input = this;
			mouseEnter = true;
			if (document.activeElement !== input && opts.showMaskOnHover) {
				if (input.inputmask._valueGet() !== getBuffer().join("")) {
					writeBuffer(input, getBuffer());
				}
			}
		}

		function submitEvent(e) { //trigger change on submit if any
			if (undoValue !== getBuffer().join("")) {
				$el.trigger("change");
			}
			if (opts.clearMaskOnLostFocus && getLastValidPosition() === -1 && el.inputmask._valueGet && el.inputmask._valueGet() === getBufferTemplate().join("")) {
				el.inputmask._valueSet(""); //clear masktemplete on submit and still has focus
			}
			if (opts.removeMaskOnSubmit) {
				el.inputmask._valueSet(el.inputmask.unmaskedvalue(), true);
				setTimeout(function () {
					writeBuffer(el, getBuffer());
				}, 0);
			}
		}

		function resetEvent(e) {
			setTimeout(function () {
				$el.trigger("setvalue");
			}, 0);
		}

		function mask(elem) {
			el = elem;
			$el = $(el);

			//show tooltip
			if (opts.showTooltip) {
				el.title = opts.tooltip || getMaskSet().mask;
			}

			if (el.dir === "rtl" || opts.rightAlign) {
				el.style.textAlign = "right";
			}

			if (el.dir === "rtl" || opts.numericInput) {
				el.dir = "ltr";
				el.removeAttribute("dir");
				el.inputmask.isRTL = true;
				isRTL = true;
			}

			//unbind all events - to make sure that no other mask will interfere when re-masking
			EventRuler.off(el);
			patchValueProperty(el);
			if (isElementTypeSupported(el, opts)) {
				//bind events
				EventRuler.on(el, "submit", submitEvent);
				EventRuler.on(el, "reset", resetEvent);

				EventRuler.on(el, "mouseenter", mouseenterEvent);
				EventRuler.on(el, "blur", blurEvent);
				EventRuler.on(el, "focus", focusEvent);
				EventRuler.on(el, "mouseleave", mouseleaveEvent);
				EventRuler.on(el, "click", clickEvent);
				EventRuler.on(el, "dblclick", dblclickEvent);
				EventRuler.on(el, "paste", pasteEvent);
				EventRuler.on(el, "dragdrop", pasteEvent);
				EventRuler.on(el, "drop", pasteEvent);
				EventRuler.on(el, "cut", cutEvent);
				EventRuler.on(el, "complete", opts.oncomplete);
				EventRuler.on(el, "incomplete", opts.onincomplete);
				EventRuler.on(el, "cleared", opts.oncleared);
				if (opts.inputEventOnly !== true) {
					EventRuler.on(el, "keydown", keydownEvent);
					EventRuler.on(el, "keypress", keypressEvent);
				}
				EventRuler.on(el, "input", inputFallBackEvent);
			}
			EventRuler.on(el, "setvalue", setValueEvent);

			//apply mask
			if (el.inputmask._valueGet() !== "" || opts.clearMaskOnLostFocus === false || document.activeElement === el) {
				var initialValue = $.isFunction(opts.onBeforeMask) ? (opts.onBeforeMask(el.inputmask._valueGet(), opts) || el.inputmask._valueGet()) : el.inputmask._valueGet();
				checkVal(el, true, false, initialValue.split(""));
				var buffer = getBuffer().slice();
				undoValue = buffer.join("");
				// Wrap document.activeElement in a try/catch block since IE9 throw "Unspecified error" if document.activeElement is undefined when we are in an IFrame.
				if (isComplete(buffer) === false) {
					if (opts.clearIncomplete) {
						resetMaskSet();
					}
				}
				if (opts.clearMaskOnLostFocus && document.activeElement !== el) {
					if (getLastValidPosition() === -1) {
						buffer = [];
					} else {
						clearOptionalTail(buffer);
					}
				}
				writeBuffer(el, buffer);
				if (document.activeElement === el) { //position the caret when in focus
					caret(el, seekNext(getLastValidPosition()));
				}
			}
		}

//action object
		var valueBuffer;
		if (actionObj !== undefined) {
			switch (actionObj.action) {
				case "isComplete":
					el = actionObj.el;
					return isComplete(getBuffer());
				case "unmaskedvalue":
					el = actionObj.el;

					if (el !== undefined && el.inputmask !== undefined) {
						maskset = el.inputmask.maskset;
						opts = el.inputmask.opts;
						isRTL = el.inputmask.isRTL;
					} else {
						valueBuffer = actionObj.value;

						if (opts.numericInput) {
							isRTL = true;
						}

						valueBuffer = ($.isFunction(opts.onBeforeMask) ? (opts.onBeforeMask(valueBuffer, opts) || valueBuffer) : valueBuffer).split("");
						checkVal(undefined, false, false, isRTL ? valueBuffer.reverse() : valueBuffer);
						if ($.isFunction(opts.onBeforeWrite)) opts.onBeforeWrite(undefined, getBuffer(), 0, opts);
					}
					return unmaskedvalue(el);
				case "mask":
					el = actionObj.el;
					maskset = el.inputmask.maskset;
					opts = el.inputmask.opts;
					isRTL = el.inputmask.isRTL;
					undoValue = getBuffer().join("");
					mask(el);
					break;
				case "format":
					if (opts.numericInput) {
						isRTL = true;
					}
					valueBuffer = ($.isFunction(opts.onBeforeMask) ? (opts.onBeforeMask(actionObj.value, opts) || actionObj.value) : actionObj.value).split("");
					checkVal(undefined, false, false, isRTL ? valueBuffer.reverse() : valueBuffer);
					if ($.isFunction(opts.onBeforeWrite)) opts.onBeforeWrite(undefined, getBuffer(), 0, opts);

					if (actionObj.metadata) {
						return {
							value: isRTL ? getBuffer().slice().reverse().join("") : getBuffer().join(""),
							metadata: maskScope({
								"action": "getmetadata"
							}, maskset, opts)
						};
					}

					return isRTL ? getBuffer().slice().reverse().join("") : getBuffer().join("");
				case "isValid":
					if (opts.numericInput) {
						isRTL = true;
					}
					if (actionObj.value) {
						valueBuffer = actionObj.value.split("");
						checkVal(undefined, false, true, isRTL ? valueBuffer.reverse() : valueBuffer);
					} else {
						actionObj.value = getBuffer().join("");
					}
					var buffer = getBuffer();
					var rl = determineLastRequiredPosition(),
						lmib = buffer.length - 1;
					for (; lmib > rl; lmib--) {
						if (isMask(lmib)) break;
					}
					buffer.splice(rl, lmib + 1 - rl);

					return isComplete(buffer) && actionObj.value === getBuffer().join("");
				case "getemptymask":
					return getBufferTemplate().join("");
				case "remove":
					el = actionObj.el;
					$el = $(el);
					maskset = el.inputmask.maskset;
					opts = el.inputmask.opts;
					//writeout the unmaskedvalue
					el.inputmask._valueSet(unmaskedvalue(el));
					//unbind all events
					EventRuler.off(el);
					//restore the value property
					var valueProperty;
					if (Object.getOwnPropertyDescriptor && Object.getPrototypeOf) {
						valueProperty = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
						if (valueProperty) {
							if (el.inputmask.__valueGet) {
								Object.defineProperty(el, "value", {
									get: el.inputmask.__valueGet,
									set: el.inputmask.__valueSet,
									configurable: true
								});
							}
						}
					} else if (document.__lookupGetter__ && el.__lookupGetter__("value")) {
						if (el.inputmask.__valueGet) {
							el.__defineGetter__("value", el.inputmask.__valueGet);
							el.__defineSetter__("value", el.inputmask.__valueSet);
						}
					}
					//clear data
					el.inputmask = undefined;
					break;
				case "getmetadata":
					if ($.isArray(maskset.metadata)) {
						//find last alternation
						var alternation, lvp = getLastValidPosition(undefined, true);
						for (var firstAlt = lvp; firstAlt >= 0; firstAlt--) {
							if (getMaskSet().validPositions[firstAlt] && getMaskSet().validPositions[firstAlt].alternation !== undefined) {
								alternation = getMaskSet().validPositions[firstAlt].alternation;
								break;
							}
						}
						return alternation !== undefined ? maskset.metadata[getMaskSet().validPositions[firstAlt].locator[alternation]] : [];
					}

					return maskset.metadata;
			}
		}
	}

//make inputmask available
	window.Inputmask = Inputmask;
	return Inputmask;
}));

/* End */
;
; /* Start:/local/lib/frontend/jquery.inputmask/inputmask.date.extensions.js*/
/*
 Input Mask plugin extensions
 http://github.com/RobinHerbots/jquery.inputmask
 Copyright (c) 2010 -  Robin Herbots
 Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
 Version: 0.0.0-dev

 Optional extensions on the jquery.inputmask base
 */
(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["inputmask.dependencyLib", "inputmask"], factory);
	} else if (typeof exports === "object") {
		module.exports = factory(require("./inputmask.dependencyLib.jquery"), require("./inputmask"));
	} else {
		factory(window.dependencyLib || jQuery, window.Inputmask);
	}
}
(function ($, Inputmask) {
	//date & time aliases
	Inputmask.extendDefinitions({
		"h": { //hours
			validator: "[01][0-9]|2[0-3]",
			cardinality: 2,
			prevalidator: [{
				validator: "[0-2]",
				cardinality: 1
			}]
		},
		"s": { //seconds || minutes
			validator: "[0-5][0-9]",
			cardinality: 2,
			prevalidator: [{
				validator: "[0-5]",
				cardinality: 1
			}]
		},
		"d": { //basic day
			validator: "0[1-9]|[12][0-9]|3[01]",
			cardinality: 2,
			prevalidator: [{
				validator: "[0-3]",
				cardinality: 1
			}]
		},
		"m": { //basic month
			validator: "0[1-9]|1[012]",
			cardinality: 2,
			prevalidator: [{
				validator: "[01]",
				cardinality: 1
			}]
		},
		"y": { //basic year
			validator: "(19|20)\\d{2}",
			cardinality: 4,
			prevalidator: [{
				validator: "[12]",
				cardinality: 1
			}, {
				validator: "(19|20)",
				cardinality: 2
			}, {
				validator: "(19|20)\\d",
				cardinality: 3
			}]
		}
	});
	Inputmask.extendAliases({
		"dd/mm/yyyy": {
			mask: "1/2/y",
			placeholder: "dd/mm/yyyy",
			regex: {
				val1pre: new RegExp("[0-3]"), //daypre
				val1: new RegExp("0[1-9]|[12][0-9]|3[01]"), //day
				val2pre: function (separator) {
					var escapedSeparator = Inputmask.escapeRegex.call(this, separator);
					return new RegExp("((0[1-9]|[12][0-9]|3[01])" + escapedSeparator + "[01])");
				}, //monthpre
				val2: function (separator) {
					var escapedSeparator = Inputmask.escapeRegex.call(this, separator);
					return new RegExp("((0[1-9]|[12][0-9])" + escapedSeparator + "(0[1-9]|1[012]))|(30" + escapedSeparator + "(0[13-9]|1[012]))|(31" + escapedSeparator + "(0[13578]|1[02]))");
				} //month
			},
			leapday: "29/02/",
			separator: "/",
			yearrange: {
				minyear: 1900,
				maxyear: 2099
			},
			isInYearRange: function (chrs, minyear, maxyear) {
				if (isNaN(chrs)) return false;
				var enteredyear = parseInt(chrs.concat(minyear.toString().slice(chrs.length)));
				var enteredyear2 = parseInt(chrs.concat(maxyear.toString().slice(chrs.length)));
				return (!isNaN(enteredyear) ? minyear <= enteredyear && enteredyear <= maxyear : false) ||
					(!isNaN(enteredyear2) ? minyear <= enteredyear2 && enteredyear2 <= maxyear : false);
			},
			determinebaseyear: function (minyear, maxyear, hint) {
				var currentyear = (new Date()).getFullYear();
				if (minyear > currentyear) return minyear;
				if (maxyear < currentyear) {
					var maxYearPrefix = maxyear.toString().slice(0, 2);
					var maxYearPostfix = maxyear.toString().slice(2, 4);
					while (maxyear < maxYearPrefix + hint) {
						maxYearPrefix--;
					}
					var maxxYear = maxYearPrefix + maxYearPostfix;
					return minyear > maxxYear ? minyear : maxxYear;
				}
				if (minyear <= currentyear && currentyear <= maxyear) {
					var currentYearPrefix = currentyear.toString().slice(0, 2);
					while (maxyear < currentYearPrefix + hint) {
						currentYearPrefix--;
					}
					var currentYearAndHint = currentYearPrefix + hint;
					return currentYearAndHint < minyear ? minyear : currentYearAndHint;
				}
				return currentyear;
			},
			onKeyDown: function (e, buffer, caretPos, opts) {
				var $input = $(this);
				if (e.ctrlKey && e.keyCode === Inputmask.keyCode.RIGHT) {
					var today = new Date();
					$input.val(today.getDate().toString() + (today.getMonth() + 1).toString() + today.getFullYear().toString());
					$input.trigger("setvalue");
				}
			},
			getFrontValue: function (mask, buffer, opts) {
				var start = 0,
					length = 0;
				for (var i = 0; i < mask.length; i++) {
					if (mask.charAt(i) === "2") break;
					var definition = opts.definitions[mask.charAt(i)];
					if (definition) {
						start += length;
						length = definition.cardinality;
					} else length++;
				}
				return buffer.join("").substr(start, length);
			},
			definitions: {
				"1": { //val1 ~ day or month
					validator: function (chrs, maskset, pos, strict, opts) {
						var isValid = opts.regex.val1.test(chrs);
						if (!strict && !isValid) {
							if (chrs.charAt(1) === opts.separator || "-./".indexOf(chrs.charAt(1)) !== -1) {
								isValid = opts.regex.val1.test("0" + chrs.charAt(0));
								if (isValid) {
									maskset.buffer[pos - 1] = "0";
									return {
										"refreshFromBuffer": {
											start: pos - 1,
											end: pos
										},
										"pos": pos,
										"c": chrs.charAt(0)
									};
								}
							}
						}
						return isValid;
					},
					cardinality: 2,
					prevalidator: [{
						validator: function (chrs, maskset, pos, strict, opts) {
							var pchrs = chrs;
							if (!isNaN(maskset.buffer[pos + 1])) pchrs += maskset.buffer[pos + 1];
							var isValid = pchrs.length === 1 ? opts.regex.val1pre.test(pchrs) : opts.regex.val1.test(pchrs);
							if (!strict && !isValid) {
								isValid = opts.regex.val1.test(chrs + "0");
								if (isValid) {
									maskset.buffer[pos] = chrs;
									maskset.buffer[++pos] = "0";
									return {
										"pos": pos,
										"c": "0"
									};
								}
								isValid = opts.regex.val1.test("0" + chrs);
								if (isValid) {
									maskset.buffer[pos] = "0";
									pos++;
									return {
										"pos": pos
									};
								}
							}
							return isValid;
						},
						cardinality: 1
					}]
				},
				"2": { //val2 ~ day or month
					validator: function (chrs, maskset, pos, strict, opts) {
						var frontValue = opts.getFrontValue(maskset.mask, maskset.buffer, opts);
						if (frontValue.indexOf(opts.placeholder[0]) !== -1) frontValue = "01" + opts.separator;
						var isValid = opts.regex.val2(opts.separator).test(frontValue + chrs);
						if (!strict && !isValid) {
							if (chrs.charAt(1) === opts.separator || "-./".indexOf(chrs.charAt(1)) !== -1) {
								isValid = opts.regex.val2(opts.separator).test(frontValue + "0" + chrs.charAt(0));
								if (isValid) {
									maskset.buffer[pos - 1] = "0";
									return {
										"refreshFromBuffer": {
											start: pos - 1,
											end: pos
										},
										"pos": pos,
										"c": chrs.charAt(0)
									};
								}
							}
						}

						//check leap yeap
						if ((opts.mask.indexOf("2") === opts.mask.length - 1) && isValid) {
							var dayMonthValue = maskset.buffer.join("").substr(4, 4) + chrs;
							if (dayMonthValue !== opts.leapday) {
								return true;
							} else {
								var year = parseInt(maskset.buffer.join("").substr(0, 4), 10); //detect leap year
								if (year % 4 === 0) {
									if (year % 100 === 0) {
										if (year % 400 === 0) {
											return true;
										} else {
											return false;
										}
									} else {
										return true;
									}
								} else return false;
							}
						}

						return isValid;
					},
					cardinality: 2,
					prevalidator: [{
						validator: function (chrs, maskset, pos, strict, opts) {
							if (!isNaN(maskset.buffer[pos + 1])) chrs += maskset.buffer[pos + 1];
							var frontValue = opts.getFrontValue(maskset.mask, maskset.buffer, opts);
							if (frontValue.indexOf(opts.placeholder[0]) !== -1) frontValue = "01" + opts.separator;
							var isValid = chrs.length === 1 ? opts.regex.val2pre(opts.separator).test(frontValue + chrs) : opts.regex.val2(opts.separator).test(frontValue + chrs);
							if (!strict && !isValid) {
								isValid = opts.regex.val2(opts.separator).test(frontValue + "0" + chrs);
								if (isValid) {
									maskset.buffer[pos] = "0";
									pos++;
									return {
										"pos": pos
									};
								}
							}
							return isValid;
						},
						cardinality: 1
					}]
				},
				"y": { //year
					validator: function (chrs, maskset, pos, strict, opts) {
						if (opts.isInYearRange(chrs, opts.yearrange.minyear, opts.yearrange.maxyear)) {
							var dayMonthValue = maskset.buffer.join("").substr(0, 6);
							if (dayMonthValue !== opts.leapday) {
								return true;
							} else {
								var year = parseInt(chrs, 10); //detect leap year
								if (year % 4 === 0) {
									if (year % 100 === 0) {
										if (year % 400 === 0) return true;
										else return false;
									} else return true;
								} else return false;
							}
						} else return false;
					},
					cardinality: 4,
					prevalidator: [{
						validator: function (chrs, maskset, pos, strict, opts) {
							var isValid = opts.isInYearRange(chrs, opts.yearrange.minyear, opts.yearrange.maxyear);
							if (!strict && !isValid) {
								var yearPrefix = opts.determinebaseyear(opts.yearrange.minyear, opts.yearrange.maxyear, chrs + "0").toString().slice(0, 1);

								isValid = opts.isInYearRange(yearPrefix + chrs, opts.yearrange.minyear, opts.yearrange.maxyear);
								if (isValid) {
									maskset.buffer[pos++] = yearPrefix.charAt(0);
									return {
										"pos": pos
									};
								}
								yearPrefix = opts.determinebaseyear(opts.yearrange.minyear, opts.yearrange.maxyear, chrs + "0").toString().slice(0, 2);

								isValid = opts.isInYearRange(yearPrefix + chrs, opts.yearrange.minyear, opts.yearrange.maxyear);
								if (isValid) {
									maskset.buffer[pos++] = yearPrefix.charAt(0);
									maskset.buffer[pos++] = yearPrefix.charAt(1);
									return {
										"pos": pos
									};
								}
							}
							return isValid;
						},
						cardinality: 1
					}, {
						validator: function (chrs, maskset, pos, strict, opts) {
							var isValid = opts.isInYearRange(chrs, opts.yearrange.minyear, opts.yearrange.maxyear);
							if (!strict && !isValid) {
								var yearPrefix = opts.determinebaseyear(opts.yearrange.minyear, opts.yearrange.maxyear, chrs).toString().slice(0, 2);

								isValid = opts.isInYearRange(chrs[0] + yearPrefix[1] + chrs[1], opts.yearrange.minyear, opts.yearrange.maxyear);
								if (isValid) {
									maskset.buffer[pos++] = yearPrefix.charAt(1);
									return {
										"pos": pos
									};
								}

								yearPrefix = opts.determinebaseyear(opts.yearrange.minyear, opts.yearrange.maxyear, chrs).toString().slice(0, 2);
								if (opts.isInYearRange(yearPrefix + chrs, opts.yearrange.minyear, opts.yearrange.maxyear)) {
									var dayMonthValue = maskset.buffer.join("").substr(0, 6);
									if (dayMonthValue !== opts.leapday) {
										isValid = true;
									} else {
										var year = parseInt(chrs, 10); //detect leap year
										if (year % 4 === 0) {
											if (year % 100 === 0) {
												if (year % 400 === 0) isValid = true;
												else isValid = false;
											} else isValid = true;
										} else isValid = false;
									}
								} else isValid = false;
								if (isValid) {
									maskset.buffer[pos - 1] = yearPrefix.charAt(0);
									maskset.buffer[pos++] = yearPrefix.charAt(1);
									maskset.buffer[pos++] = chrs.charAt(0);
									return {
										"refreshFromBuffer": {
											start: pos - 3,
											end: pos
										},
										"pos": pos
									};
								}
							}
							return isValid;
						},
						cardinality: 2
					}, {
						validator: function (chrs, maskset, pos, strict, opts) {
							return opts.isInYearRange(chrs, opts.yearrange.minyear, opts.yearrange.maxyear);
						},
						cardinality: 3
					}]
				}
			},
			insertMode: false,
			autoUnmask: false
		},
		"mm/dd/yyyy": {
			placeholder: "mm/dd/yyyy",
			alias: "dd/mm/yyyy", //reuse functionality of dd/mm/yyyy alias
			regex: {
				val2pre: function (separator) {
					var escapedSeparator = Inputmask.escapeRegex.call(this, separator);
					return new RegExp("((0[13-9]|1[012])" + escapedSeparator + "[0-3])|(02" + escapedSeparator + "[0-2])");
				}, //daypre
				val2: function (separator) {
					var escapedSeparator = Inputmask.escapeRegex.call(this, separator);
					return new RegExp("((0[1-9]|1[012])" + escapedSeparator + "(0[1-9]|[12][0-9]))|((0[13-9]|1[012])" + escapedSeparator + "30)|((0[13578]|1[02])" + escapedSeparator + "31)");
				}, //day
				val1pre: new RegExp("[01]"), //monthpre
				val1: new RegExp("0[1-9]|1[012]") //month
			},
			leapday: "02/29/",
			onKeyDown: function (e, buffer, caretPos, opts) {
				var $input = $(this);
				if (e.ctrlKey && e.keyCode === Inputmask.keyCode.RIGHT) {
					var today = new Date();
					$input.val((today.getMonth() + 1).toString() + today.getDate().toString() + today.getFullYear().toString());
					$input.trigger("setvalue");
				}
			}
		},
		"yyyy/mm/dd": {
			mask: "y/1/2",
			placeholder: "yyyy/mm/dd",
			alias: "mm/dd/yyyy",
			leapday: "/02/29",
			onKeyDown: function (e, buffer, caretPos, opts) {
				var $input = $(this);
				if (e.ctrlKey && e.keyCode === Inputmask.keyCode.RIGHT) {
					var today = new Date();
					$input.val(today.getFullYear().toString() + (today.getMonth() + 1).toString() + today.getDate().toString());
					$input.trigger("setvalue");
				}
			}
		},
		"dd.mm.yyyy": {
			mask: "1.2.y",
			placeholder: "dd.mm.yyyy",
			leapday: "29.02.",
			separator: ".",
			alias: "dd/mm/yyyy"
		},
		"dd-mm-yyyy": {
			mask: "1-2-y",
			placeholder: "dd-mm-yyyy",
			leapday: "29-02-",
			separator: "-",
			alias: "dd/mm/yyyy"
		},
		"mm.dd.yyyy": {
			mask: "1.2.y",
			placeholder: "mm.dd.yyyy",
			leapday: "02.29.",
			separator: ".",
			alias: "mm/dd/yyyy"
		},
		"mm-dd-yyyy": {
			mask: "1-2-y",
			placeholder: "mm-dd-yyyy",
			leapday: "02-29-",
			separator: "-",
			alias: "mm/dd/yyyy"
		},
		"yyyy.mm.dd": {
			mask: "y.1.2",
			placeholder: "yyyy.mm.dd",
			leapday: ".02.29",
			separator: ".",
			alias: "yyyy/mm/dd"
		},
		"yyyy-mm-dd": {
			mask: "y-1-2",
			placeholder: "yyyy-mm-dd",
			leapday: "-02-29",
			separator: "-",
			alias: "yyyy/mm/dd"
		},
		"datetime": {
			mask: "1/2/y h:s",
			placeholder: "dd/mm/yyyy hh:mm",
			alias: "dd/mm/yyyy",
			regex: {
				hrspre: new RegExp("[012]"), //hours pre
				hrs24: new RegExp("2[0-4]|1[3-9]"),
				hrs: new RegExp("[01][0-9]|2[0-4]"), //hours
				ampm: new RegExp("^[a|p|A|P][m|M]"),
				mspre: new RegExp("[0-5]"), //minutes/seconds pre
				ms: new RegExp("[0-5][0-9]")
			},
			timeseparator: ":",
			hourFormat: "24", // or 12
			definitions: {
				"h": { //hours
					validator: function (chrs, maskset, pos, strict, opts) {
						if (opts.hourFormat === "24") {
							if (parseInt(chrs, 10) === 24) {
								maskset.buffer[pos - 1] = "0";
								maskset.buffer[pos] = "0";
								return {
									"refreshFromBuffer": {
										start: pos - 1,
										end: pos
									},
									"c": "0"
								};
							}
						}

						var isValid = opts.regex.hrs.test(chrs);
						if (!strict && !isValid) {
							if (chrs.charAt(1) === opts.timeseparator || "-.:".indexOf(chrs.charAt(1)) !== -1) {
								isValid = opts.regex.hrs.test("0" + chrs.charAt(0));
								if (isValid) {
									maskset.buffer[pos - 1] = "0";
									maskset.buffer[pos] = chrs.charAt(0);
									pos++;
									return {
										"refreshFromBuffer": {
											start: pos - 2,
											end: pos
										},
										"pos": pos,
										"c": opts.timeseparator
									};
								}
							}
						}

						if (isValid && opts.hourFormat !== "24" && opts.regex.hrs24.test(chrs)) {

							var tmp = parseInt(chrs, 10);

							if (tmp === 24) {
								maskset.buffer[pos + 5] = "a";
								maskset.buffer[pos + 6] = "m";
							} else {
								maskset.buffer[pos + 5] = "p";
								maskset.buffer[pos + 6] = "m";
							}

							tmp = tmp - 12;

							if (tmp < 10) {
								maskset.buffer[pos] = tmp.toString();
								maskset.buffer[pos - 1] = "0";
							} else {
								maskset.buffer[pos] = tmp.toString().charAt(1);
								maskset.buffer[pos - 1] = tmp.toString().charAt(0);
							}

							return {
								"refreshFromBuffer": {
									start: pos - 1,
									end: pos + 6
								},
								"c": maskset.buffer[pos]
							};
						}

						return isValid;
					},
					cardinality: 2,
					prevalidator: [{
						validator: function (chrs, maskset, pos, strict, opts) {
							var isValid = opts.regex.hrspre.test(chrs);
							if (!strict && !isValid) {
								isValid = opts.regex.hrs.test("0" + chrs);
								if (isValid) {
									maskset.buffer[pos] = "0";
									pos++;
									return {
										"pos": pos
									};
								}
							}
							return isValid;
						},
						cardinality: 1
					}]
				},
				"s": { //seconds || minutes
					validator: "[0-5][0-9]",
					cardinality: 2,
					prevalidator: [{
						validator: function (chrs, maskset, pos, strict, opts) {
							var isValid = opts.regex.mspre.test(chrs);
							if (!strict && !isValid) {
								isValid = opts.regex.ms.test("0" + chrs);
								if (isValid) {
									maskset.buffer[pos] = "0";
									pos++;
									return {
										"pos": pos
									};
								}
							}
							return isValid;
						},
						cardinality: 1
					}]
				},
				"t": { //am/pm
					validator: function (chrs, maskset, pos, strict, opts) {
						return opts.regex.ampm.test(chrs + "m");
					},
					casing: "lower",
					cardinality: 1
				}
			},
			insertMode: false,
			autoUnmask: false
		},
		"datetime12": {
			mask: "1/2/y h:s t\\m",
			placeholder: "dd/mm/yyyy hh:mm xm",
			alias: "datetime",
			hourFormat: "12"
		},
		"mm/dd/yyyy hh:mm xm": {
			mask: "1/2/y h:s t\\m",
			placeholder: "mm/dd/yyyy hh:mm xm",
			alias: "datetime12",
			regex: {
				val2pre: function (separator) {
					var escapedSeparator = Inputmask.escapeRegex.call(this, separator);
					return new RegExp("((0[13-9]|1[012])" + escapedSeparator + "[0-3])|(02" + escapedSeparator + "[0-2])");
				},
				val2: function (separator) {
					var escapedSeparator = Inputmask.escapeRegex.call(this, separator);
					return new RegExp("((0[1-9]|1[012])" + escapedSeparator + "(0[1-9]|[12][0-9]))|((0[13-9]|1[012])" + escapedSeparator + "30)|((0[13578]|1[02])" + escapedSeparator + "31)");
				},
				val1pre: new RegExp("[01]"),
				val1: new RegExp("0[1-9]|1[012]")
			},
			leapday: "02/29/",
			onKeyDown: function (e, buffer, caretPos, opts) {
				var $input = $(this);
				if (e.ctrlKey && e.keyCode === Inputmask.keyCode.RIGHT) {
					var today = new Date();
					$input.val((today.getMonth() + 1).toString() + today.getDate().toString() + today.getFullYear().toString());
					$input.trigger("setvalue");
				}
			}
		},
		"hh:mm t": {
			mask: "h:s t\\m",
			placeholder: "hh:mm xm",
			alias: "datetime",
			hourFormat: "12"
		},
		"h:s t": {
			mask: "h:s t\\m",
			placeholder: "hh:mm xm",
			alias: "datetime",
			hourFormat: "12"
		},
		"hh:mm:ss": {
			mask: "h:s:s",
			placeholder: "hh:mm:ss",
			alias: "datetime",
			autoUnmask: false
		},
		"hh:mm": {
			mask: "h:s",
			placeholder: "hh:mm",
			alias: "datetime",
			autoUnmask: false
		},
		"date": {
			alias: "dd/mm/yyyy" // "mm/dd/yyyy"
		},
		"mm/yyyy": {
			mask: "1/y",
			placeholder: "mm/yyyy",
			leapday: "donotuse",
			separator: "/",
			alias: "mm/dd/yyyy"
		},
		"shamsi": {
			regex: {
				val2pre: function (separator) {
					var escapedSeparator = Inputmask.escapeRegex.call(this, separator);
					return new RegExp("((0[1-9]|1[012])" + escapedSeparator + "[0-3])");
				},
				val2: function (separator) {
					var escapedSeparator = Inputmask.escapeRegex.call(this, separator);
					return new RegExp("((0[1-9]|1[012])" + escapedSeparator + "(0[1-9]|[12][0-9]))|((0[1-9]|1[012])" + escapedSeparator + "30)|((0[1-6])" + escapedSeparator + "31)");
				},
				val1pre: new RegExp("[01]"),
				val1: new RegExp("0[1-9]|1[012]")
			},
			yearrange: {
				minyear: 1300,
				maxyear: 1499
			},
			mask: "y/1/2",
			leapday: "/12/30",
			placeholder: "yyyy/mm/dd",
			alias: "mm/dd/yyyy",
			clearIncomplete: true
		}
	});

	return Inputmask;
}));

/* End */
;
; /* Start:/local/lib/frontend/jquery.inputmask/inputmask.phone.extensions.js*/
/*
 Input Mask plugin extensions
 http://github.com/RobinHerbots/jquery.inputmask
 Copyright (c) 2010 -  Robin Herbots
 Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
 Version: 0.0.0-dev

 Phone extension.
 When using this extension make sure you specify the correct url to get the masks

 $(selector).inputmask("phone", {
 url: "Scripts/jquery.inputmask/phone-codes/phone-codes.json",
 onKeyValidation: function () { //show some metadata in the console
 console.log($(this).inputmask("getmetadata")["cd"]);
 }
 });


 */
(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["jquery", "inputmask"], factory);
	} else if (typeof exports === "object") {
		module.exports = factory(require("jquery"), require("./inputmask"));
	} else {
		factory(window.dependencyLib || jQuery, window.Inputmask);
	}
}
(function ($, Inputmask) {
	Inputmask.extendAliases({
		"phone": {
			url: "phone-codes/phone-codes.js",
			countrycode: "",
			phoneCodeCache: {},
			mask: function (opts) {
				if (opts.phoneCodeCache[opts.url] === undefined) {
					var maskList = [];
					opts.definitions["#"] = opts.definitions["9"];
					$.ajax({
						url: opts.url,
						async: false,
						type: "get",
						dataType: "json",
						success: function (response) {
							maskList = response;
						},
						error: function (xhr, ajaxOptions, thrownError) {
							alert(thrownError + " - " + opts.url);
						}
					});

					opts.phoneCodeCache[opts.url] = maskList.sort(function (a, b) {
						return (a.mask || a) < (b.mask || b) ? -1 : 1;
					});
				}
				return opts.phoneCodeCache[opts.url];
			},
			keepStatic: false,
			nojumps: true,
			nojumpsThreshold: 1,
			onBeforeMask: function (value, opts) {
				var processedValue = value.replace(/^0{1,2}/, "").replace(/[\s]/g, "");
				if (processedValue.indexOf(opts.countrycode) > 1 || processedValue.indexOf(opts.countrycode) === -1) {
					processedValue = "+" + opts.countrycode + processedValue;
				}

				return processedValue;
			}
		},
		"phonebe": {
			alias: "phone",
			url: "phone-codes/phone-be.js",
			countrycode: "32",
			nojumpsThreshold: 4
		}
	});
	return Inputmask;
}));

/* End */
;
; /* Start:/local/lib/frontend/jquery.inputmask/jquery.inputmask.js*/
/*
 * Input Mask plugin for jquery
 * http://github.com/RobinHerbots/jquery.inputmask
 * Copyright (c) 2010 -	Robin Herbots
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
 * Version: 0.0.0-dev
 */

(function (factory) {
	if (typeof define === "function" && define.amd) {
		define(["jquery", "inputmask"], factory);
	} else if (typeof exports === "object") {
		module.exports = factory(require("jquery"), require("./inputmask"));
	} else {
		factory(jQuery, window.Inputmask);
	}
}
(function ($, Inputmask) {
	if ($.fn.inputmask === undefined) {
		//jquery plugin
		$.fn.inputmask = function (fn, options) {
			var nptmask, input = this[0];
			if (options === undefined) options = {};
			if (typeof fn === "string") {
				switch (fn) {
					case "unmaskedvalue":
						return input && input.inputmask ? input.inputmask.unmaskedvalue() : $(input).val();
					case "remove":
						return this.each(function () {
							if (this.inputmask) this.inputmask.remove();
						});
					case "getemptymask":
						return input && input.inputmask ? input.inputmask.getemptymask() : "";
					case "hasMaskedValue": //check wheter the returned value is masked or not; currently only works reliable when using jquery.val fn to retrieve the value
						return input && input.inputmask ? input.inputmask.hasMaskedValue() : false;
					case "isComplete":
						return input && input.inputmask ? input.inputmask.isComplete() : true;
					case "getmetadata": //return mask metadata if exists
						return input && input.inputmask ? input.inputmask.getmetadata() : undefined;
					case "setvalue":
						$(input).val(options);
						if (input && input.inputmask === undefined) { //reactivate jquery.clone
							$(input).triggerHandler("setvalue");
						}
						break;
					case "option":
						if (typeof options === "string") {
							if (input && input.inputmask !== undefined) {
								return input.inputmask.option(options);
							}
						} else {
							return this.each(function () {
								if (this.inputmask !== undefined) {
									return this.inputmask.option(options);
								}
							});
						}
						break;
					default:
						options.alias = fn;
						nptmask = new Inputmask(options);
						return this.each(function () {
							nptmask.mask(this);
						});
				}
			} else if (typeof fn == "object") {
				nptmask = new Inputmask(fn);
				if (fn.mask === undefined && fn.alias === undefined) {
					return this.each(function () {
						if (this.inputmask !== undefined) {
							return this.inputmask.option(fn);
						} else nptmask.mask(this);
					});
				} else {
					return this.each(function () {
						nptmask.mask(this);
					});
				}
			} else if (fn === undefined) {
				//look for data-inputmask atributes
				return this.each(function () {
					nptmask = new Inputmask(options);
					nptmask.mask(this);
				});
			}
		};
	}
	return $.fn.inputmask;
}));

/* End */
;
; /* Start:/bitrix/components/custom/search.title/script.js*/
function JCTitleSearch(arParams)
{
	var _this = this;

	this.arParams = {
		'AJAX_PAGE': arParams.AJAX_PAGE,
		'CONTAINER_ID': arParams.CONTAINER_ID,
		'INPUT_ID': arParams.INPUT_ID,
		'MIN_QUERY_LEN': parseInt(arParams.MIN_QUERY_LEN)
	};
	if(arParams.WAIT_IMAGE)
		this.arParams.WAIT_IMAGE = arParams.WAIT_IMAGE;
	if(arParams.MIN_QUERY_LEN <= 0)
		arParams.MIN_QUERY_LEN = 1;

	this.cache = [];
	this.cache_key = null;

	this.startText = '';
	this.currentRow = -1;
	this.RESULT = null;
	this.CONTAINER = null;
	this.INPUT = null;
	this.WAIT = null;
	this.TIMEOUT = null;

	this.ShowResult = function(result)
	{
		var pos = BX.pos(_this.CONTAINER);
		pos.width = pos.right - pos.left;
		_this.RESULT.style.position = 'absolute';
		_this.RESULT.style.top = (pos.bottom + 2) + 'px';
		_this.RESULT.style.left = pos.left + 'px';
		_this.RESULT.style.width = pos.width + 'px';
		if(result != null)
			_this.RESULT.innerHTML = result;

		if(_this.RESULT.innerHTML.length > 0)
			_this.RESULT.style.display = 'block';
		else
			_this.RESULT.style.display = 'none';

		//ajust left column to be an outline
		var th;
		var tbl = BX.findChild(_this.RESULT, {'tag':'table','class':'title-search-result'}, true);
		if(tbl) th = BX.findChild(tbl, {'tag':'th'}, true);
		if(th)
		{
			var tbl_pos = BX.pos(tbl);
			tbl_pos.width = tbl_pos.right - tbl_pos.left;

			var th_pos = BX.pos(th);
			th_pos.width = th_pos.right - th_pos.left;
			th.style.width = th_pos.width + 'px';

			_this.RESULT.style.width = (pos.width + th_pos.width) + 'px';

			//Move table to left by width of the first column
			_this.RESULT.style.left = (pos.left - th_pos.width - 1)+ 'px';

			//Shrink table when it's too wide
			if((tbl_pos.width - th_pos.width) > pos.width)
				_this.RESULT.style.width = (pos.width + th_pos.width -1) + 'px';

			//Check if table is too wide and shrink result div to it's width
			tbl_pos = BX.pos(tbl);
			var res_pos = BX.pos(_this.RESULT);
			if(res_pos.right > tbl_pos.right)
			{
				_this.RESULT.style.width = (tbl_pos.right - tbl_pos.left) + 'px';
			}
		}

		var fade;
		if(tbl) fade = BX.findChild(_this.RESULT, {'class':'title-search-fader'}, true);
		if(fade && th)
		{
			res_pos = BX.pos(_this.RESULT);
			fade.style.left = (res_pos.right - res_pos.left - 18) + 'px';
			fade.style.width = 18 + 'px';
			fade.style.top = 0 + 'px';
			fade.style.height = (res_pos.bottom - res_pos.top) + 'px';
			fade.style.display = 'block';
		}
	}

	this.onKeyPress = function(keyCode)
	{
		var tbl = BX.findChild(_this.RESULT, {'tag':'table','class':'title-search-result'}, true);
		if(!tbl)
			return false;

		var cnt = tbl.rows.length;

		switch (keyCode)
		{
		case 27: // escape key - close search div
			_this.RESULT.style.display = 'none';
			_this.currentRow = -1;
			_this.UnSelectAll();
		return true;

		case 40: // down key - navigate down on search results
			if(_this.RESULT.style.display == 'none')
				_this.RESULT.style.display = 'block';

			var first = -1;
			for(var i = 0; i < cnt; i++)
			{
				if(!BX.findChild(tbl.rows[i], {'class':'title-search-separator'}, true))
				{
					if(first == -1)
						first = i;

					if(_this.currentRow < i)
					{
						_this.currentRow = i;
						break;
					}
					else if(tbl.rows[i].className == 'title-search-selected')
					{
						tbl.rows[i].className = '';
					}
				}
			}

			if(i == cnt && _this.currentRow != i)
				_this.currentRow = first;

			tbl.rows[_this.currentRow].className = 'title-search-selected';
		return true;

		case 38: // up key - navigate up on search results
			if(_this.RESULT.style.display == 'none')
				_this.RESULT.style.display = 'block';

			var last = -1;
			for(var i = cnt-1; i >= 0; i--)
			{
				if(!BX.findChild(tbl.rows[i], {'class':'title-search-separator'}, true))
				{
					if(last == -1)
						last = i;

					if(_this.currentRow > i)
					{
						_this.currentRow = i;
						break;
					}
					else if(tbl.rows[i].className == 'title-search-selected')
					{
						tbl.rows[i].className = '';
					}
				}
			}

			if(i < 0 && _this.currentRow != i)
				_this.currentRow = last;

			tbl.rows[_this.currentRow].className = 'title-search-selected';
		return true;

		case 13: // enter key - choose current search result
			if(_this.RESULT.style.display == 'block')
			{
				for(var i = 0; i < cnt; i++)
				{
					if(_this.currentRow == i)
					{
						if(!BX.findChild(tbl.rows[i], {'class':'title-search-separator'}, true))
						{
							var a = BX.findChild(tbl.rows[i], {'tag':'a'}, true);
							if(a)
							{
								window.location = a.href;
								return true;
							}
						}
					}
				}
			}
		return false;
		}

		return false;
	}

	this.onTimeout = function()
	{
		_this.onChange(function(){
			setTimeout(_this.onTimeout, 500);
		});
	}
	this.onChange = function(callback)
	{
		if(_this.INPUT.value != _this.oldValue && _this.INPUT.value != _this.startText)
		{
			_this.oldValue = _this.INPUT.value;
			if(_this.INPUT.value.length >= _this.arParams.MIN_QUERY_LEN)
			{
				_this.cache_key = _this.arParams.INPUT_ID + '|' + _this.INPUT.value;
				if(_this.cache[_this.cache_key] == null)
				{
					if( _this.TIMEOUT == null ) {
						_this.TIMEOUT = setTimeout(function() {
							_this.TIMEOUT = null;
							_this.onChange();
						}, 500);
					} else 
						return;
					
					if(_this.WAIT)
					{
						var pos = BX.pos(_this.INPUT);
						var height = (pos.bottom - pos.top)-2;
						_this.WAIT.style.top = (pos.top+1) + 'px';
						_this.WAIT.style.height = height + 'px';
						_this.WAIT.style.width = height + 'px';
						_this.WAIT.style.left = (pos.right - height + 2) + 'px';
						_this.WAIT.style.display = 'block';
					}

					BX.ajax.post(
						_this.arParams.AJAX_PAGE,
						{
							'ajax_call':'y',
							'INPUT_ID':_this.arParams.INPUT_ID,
							'q':_this.INPUT.value,
							'l':_this.arParams.MIN_QUERY_LEN
						},
						function(result)
						{
							_this.cache[_this.cache_key] = result;
							_this.ShowResult(result);
							_this.currentRow = -1;
							_this.EnableMouseEvents();
							if(_this.WAIT)
								_this.WAIT.style.display = 'none';
							if (!!callback)
								callback();
						}
					);
					return;
				}
				else
				{
					_this.ShowResult(_this.cache[_this.cache_key]);
					_this.currentRow = -1;
					_this.EnableMouseEvents();
				}
			}
			else
			{
				_this.RESULT.style.display = 'none';
				_this.currentRow = -1;
				_this.UnSelectAll();
			}
		}
		if (!!callback)
			callback();
	}

	this.UnSelectAll = function()
	{
		var tbl = BX.findChild(_this.RESULT, {'tag':'table','class':'title-search-result'}, true);
		if(tbl)
		{
			var cnt = tbl.rows.length;
			for(var i = 0; i < cnt; i++)
				tbl.rows[i].className = '';
		}
	}

	this.EnableMouseEvents = function()
	{
		var tbl = BX.findChild(_this.RESULT, {'tag':'table','class':'title-search-result'}, true);
		if(tbl)
		{
			var cnt = tbl.rows.length;
			for(var i = 0; i < cnt; i++)
				if(!BX.findChild(tbl.rows[i], {'class':'title-search-separator'}, true))
				{
					tbl.rows[i].id = 'row_' + i;
					tbl.rows[i].onmouseover = function (e) {
						if(_this.currentRow != this.id.substr(4))
						{
							_this.UnSelectAll();
							this.className = 'title-search-selected';
							_this.currentRow = this.id.substr(4);
						}
					};
					tbl.rows[i].onmouseout = function (e) {
						this.className = '';
						_this.currentRow = -1;
					};
				}
		}
	}

	this.onFocusLost = function(hide)
	{
		setTimeout(function(){_this.RESULT.style.display = 'none';}, 250);
	}

	this.onFocusGain = function()
	{
		if(_this.RESULT.innerHTML.length)
			_this.ShowResult();
	}

	this.onKeyDown = function(e)
	{
		if(!e)
			e = window.event;

		if (_this.RESULT.style.display == 'block')
		{
			if(_this.onKeyPress(e.keyCode))
				return BX.PreventDefault(e);
		}
	}

	this.Init = function()
	{
		this.CONTAINER = document.getElementById(this.arParams.CONTAINER_ID);
		this.RESULT = document.body.appendChild(document.createElement("DIV"));
		this.RESULT.className = 'title-search-result';
		this.INPUT = document.getElementById(this.arParams.INPUT_ID);
		this.startText = this.oldValue = this.INPUT.value;
		BX.bind(this.INPUT, 'focus', function() {_this.onFocusGain()});
		BX.bind(this.INPUT, 'blur', function() {_this.onFocusLost()});

		if(BX.browser.IsSafari() || BX.browser.IsIE())
			this.INPUT.onkeydown = this.onKeyDown;
		else
			this.INPUT.onkeypress = this.onKeyDown;

		if(this.arParams.WAIT_IMAGE)
		{
			this.WAIT = document.body.appendChild(document.createElement("DIV"));
			this.WAIT.style.backgroundImage = "url('" + this.arParams.WAIT_IMAGE + "')";
			if(!BX.browser.IsIE())
				this.WAIT.style.backgroundRepeat = 'none';
			this.WAIT.style.display = 'none';
			this.WAIT.style.position = 'absolute';
			this.WAIT.style.zIndex = '1100';
		}

		BX.bind(this.INPUT, 'bxchange', function() {_this.onChange()});
	}

	BX.ready(function (){_this.Init(arParams)});
}

/* End */
;
; /* Start:/bitrix/templates/.default/components/bitrix/system.auth.form/au_mdl/script.js*/
var authFormWindow = {

	form_window: null,
	overlay : null,
	form_window_id : "login-form-window",
	login_field_id : "auth-user-login",

	ShowLoginForm : function()
	{
		if (!this.form_window)
		{
			this.form_window = document.getElementById(this.form_window_id);
			if (!this.form_window)
				return false;

			try {document.body.appendChild(this.form_window);}
			catch (e){}
		}

		this.form_window.style.display = "block";

		if (this.GetOpacityProperty())
			this.CreateOverlay();

		var loginField = document.getElementById(this.login_field_id);
		if (loginField)
		{
			loginField.focus();
			loginField.select();
		}
		return false;
	},

	CloseLoginForm : function()
	{
		if (this.form_window)
			this.form_window.style.display = "none";

		if (this.overlay)
			this.overlay.style.display = "none";

		return false;
	},

	CreateOverlay : function()
	{
		if (!this.overlay)
		{
			this.overlay = document.body.appendChild(document.createElement("DIV"));
			this.overlay.className = "login-form-overlay";

			var _this = this;
			this.overlay.onclick = function() {_this.CloseLoginForm()};
		}

		var windowSize = this.GetWindowScrollSize();

		this.overlay.style.width = windowSize.scrollWidth + "px";
		this.overlay.style.height = windowSize.scrollHeight + "px";
		this.overlay.style.display = "block";
	},

	GetOpacityProperty : function()
	{
		if (typeof document.body.style.opacity == 'string')
			return 'opacity';
		else if (typeof document.body.style.MozOpacity == 'string')
			return 'MozOpacity';
		else if (typeof document.body.style.KhtmlOpacity == 'string')
			return 'KhtmlOpacity';
		else if (document.body.filters && navigator.appVersion.match(/MSIE ([\d.]+);/)[1]>=5.5)
			return 'filter';

		return false;
	},

	GetWindowScrollSize : function(pDoc)
	{
		var width, height;
		if (!pDoc)
			pDoc = document;

		if ( (pDoc.compatMode && pDoc.compatMode == "CSS1Compat"))
		{
			width = pDoc.documentElement.scrollWidth;
			height = pDoc.documentElement.scrollHeight;
		}
		else
		{
			if (pDoc.body.scrollHeight > pDoc.body.offsetHeight)
				height = pDoc.body.scrollHeight;
			else
				height = pDoc.body.offsetHeight;

			if (pDoc.body.scrollWidth > pDoc.body.offsetWidth || 
				(pDoc.compatMode && pDoc.compatMode == "BackCompat") ||
				(pDoc.documentElement && !pDoc.documentElement.clientWidth)
			)
				width = pDoc.body.scrollWidth;
			else
				width = pDoc.body.offsetWidth;
		}
		return {scrollWidth : width, scrollHeight : height};
	}
}

var authPreloadImages = ["close.gif", "login-form-header-bg.gif"];
for (var imageIndex = 0; imageIndex < authPreloadImages.length; imageIndex++)
{
	var imageObj = new Image();
	imageObj.src = "/bitrix/templates/modern/components/bitrix/system.auth.form/auth/images/" + authPreloadImages[imageIndex];
}
authPreloadImages = null;
/* End */
;
; /* Start:/bitrix/templates/.default/components/bitrix/menu/verh/script.js*/
var jshover = function()
{
	var menuDiv = document.getElementById("horizontal-multilevel-menu")
	if (!menuDiv)
		return;

	var sfEls = menuDiv.getElementsByTagName("li");
	for (var i=0; i<sfEls.length; i++) 
	{
		sfEls[i].onmouseover=function()
		{
			this.className+=" jshover";
		}
		sfEls[i].onmouseout=function() 
		{
			this.className=this.className.replace(new RegExp(" jshover\\b"), "");
		}
	}
}

if (window.attachEvent && (typeof document.body.style.maxHeight == "undefined")) 
	window.attachEvent("onload", jshover);
/* End */
;
; /* Start:/bitrix/templates/.default/components/bitrix/menu/niz/script.js*/
var jshover = function()
{
	var menuDiv = document.getElementById("horizontal-multilevel-menu")
	if (!menuDiv)
		return;

	var sfEls = menuDiv.getElementsByTagName("li");
	for (var i=0; i<sfEls.length; i++) 
	{
		sfEls[i].onmouseover=function()
		{
			this.className+=" jshover";
		}
		sfEls[i].onmouseout=function() 
		{
			this.className=this.className.replace(new RegExp(" jshover\\b"), "");
		}
	}
}

if (window.attachEvent && (typeof document.body.style.maxHeight == "undefined")) 
	window.attachEvent("onload", jshover);
/* End */
;
; /* Start:/bitrix/templates/.default/components/bitrix/menu/edu_section/script.js*/
var jshover = function()
{
	var menuDiv = document.getElementById("horizontal-multilevel-menu")
	if (!menuDiv)
		return;

	var sfEls = menuDiv.getElementsByTagName("li");
	for (var i=0; i<sfEls.length; i++) 
	{
		sfEls[i].onmouseover=function()
		{
			this.className+=" jshover";
		}
		sfEls[i].onmouseout=function() 
		{
			this.className=this.className.replace(new RegExp(" jshover\\b"), "");
		}
	}
}

if (window.attachEvent && (typeof document.body.style.maxHeight == "undefined")) 
	window.attachEvent("onload", jshover);
/* End */
;
; /* Start:/bitrix/templates/.default/components/custom/photogallery.detail.list/left/script.js*/
function __photo_change_template(anchor, package_id)
{
	var item_value = anchor.href.match(/template\=(\w+)/gi);
	if (!item_value) { return false; }
	item_value = item_value[0].replace("template=", ""); 
	if (window['__photo_buffer']) {
		for (var ii in window['__photo_buffer'])
		{
			if (ii.indexOf('sight') >= 0) {	window['__photo_buffer'][ii] = false; }
		}
	}
	__photo_change_template_data('template', item_value, package_id, {'template' : item_value});
	
	var nodes = anchor.parentNode.parentNode.getElementsByTagName('li');
	for (var ii = 0; ii < nodes.length; ii++)
	{
		nodes[ii].className = nodes[ii].className.replace(/\s[a-z\-]+/gi, '');
	}
	anchor.parentNode.className += ' ' + anchor.parentNode.className + '-active';
}

function __photo_change_template_data(item_name, item_value, package_id, params)
{
	if (!window['__photo_buffer']) { window['__photo_buffer'] = {}; }
	if (window['__photo_buffer'][item_name + item_value + package_id])
	{
		var div = document.getElementById("photo_list_" + package_id);
		div.innerHTML = window['__photo_buffer'][item_name + item_value + package_id];
		if (window.__photo_to_init_slider)
		{
			__photo_to_init_slider();
		}
		if (null != jsUserOptions)
		{
			if(!jsUserOptions.options)
				jsUserOptions.options = new Object();
			jsUserOptions.options['photogallery.template.' + item_name] = ['photogallery', 'template', item_name, item_value, false];
			jsUserOptions.SendData(null);
		}
		return true;
	}

	var TID = jsAjax.InitThread();
	eval("jsAjax.AddAction(TID, function(data){" + 
		"try { " + 
			"jsAjaxUtil.CloseLocalWaitWindow(TID, 'photo_list_" + package_id + "'); " + 
			"var index1 = data.indexOf('<!-- Photo List " + package_id + " -->'); " + 
			"var index2 = data.indexOf('<!-- Photo List End " + package_id + " -->'); " + 
			"var div = document.getElementById('photo_list_" + package_id + "'); " + 
			"if (index1 >= 0 && index2 >= 0 && div) {" + 
				" window['__photo_buffer']['" + item_name + item_value + package_id + "'] = div.innerHTML = data.substring(index1, index2); " + 
				" if (window.__photo_to_init_slider) { " +
					" __photo_to_init_slider(); " + 
				" }" + 
			"} " + 
		"} catch (e) {alert(e.message);}});");
	var url = window.location.href.replace(/PICTURES\_SIGHT\=(\w+)/gi, '').replace(/\#(.*)/gi, '').replace(/template\=(\w+)/gi, ''); 
	params = (params ? params : {});
	params['package_id'] = package_id;
	params['sessid'] = phpVars.bitrix_sessid;
	jsAjaxUtil.ShowLocalWaitWindow(TID, 'photo_list_' + package_id, true); 
	jsAjax.Send(TID, url, params);
}
/* End */
;
; /* Start:/bitrix/components/bitrix/photogallery.detail.list/templates/slider_big/script_cursor.js*/
function BPCMixer(field, cursor, gradation, params)
{
	this.field = field;
	this.cursor = cursor;
	params = (params ? params : {});
	this.minus = (params['minus'] ? params['minus'] : false);
	this.plus = (params['plus'] ? params['plus'] : false);
	this.events = (params['events'] ? params['events'] : {});

	this.gradation = (gradation > 2 ? gradation : 7);
	this.current = 1;
	
	var _this = this;
	
	this.field.onmousedown = function(e) {
		if(!e) { e = window.event; } 
		_this.SetCursor(e.clientX + document.body.scrollLeft, true);
	}; 
	this.cursor.onmousedown = function(e) {
		_this.StartDrag(e, this);}
	this.cursor.onclick = function(e) {
		return false;}
	if (this.minus)
	{
		this.minus.onclick = function(e){
			if (_this.current > 1)
				_this.SetCursor(_this.current - 1);
		}
	}
	if (this.plus)
	{
		this.plus.onclick = function(e){
			if (_this.current < _this.gradation)
				_this.SetCursor(_this.current + 1);
		}
	}
	
	this.Init = function()
	{
		if (!this.params)
			this.params = jsUtilsPhoto.GetElementParams(this.field);
		this.current = (this.current > 0 ? this.current : 1);
		if (!this.cursor_params)
			this.cursor_params = jsUtilsPhoto.GetElementParams(this.cursor);
		this.params['real_width'] = this.params['width'] - this.cursor_params['width'];
		this.grating_period_px = Math.round(this.params['real_width'] / (this.gradation - 1));
		this.grating_period = Math.round(100 / (this.gradation - 1));
	}
	
	this.StartDrag = function(e, div)
	{
		if(!e)
			e = window.event;
		this.x = e.clientX + document.body.scrollLeft;
		this.y = e.clientY + document.body.scrollTop;
		this.floatDiv = div;

		jsUtils.addEvent(document, "mousemove", this.MoveDrag);
		document.onmouseup = this.StopDrag;
		if(document.body.setCapture)
			document.body.setCapture();

		document.onmousedown = jsUtils.False;
		var b = document.body;
		b.ondrag = jsUtils.False;
		b.onselectstart = jsUtils.False;
		b.style.MozUserSelect = _this.floatDiv.style.MozUserSelect = 'none';
	}

	this.StopDrag = function(e)
	{
		if(document.body.releaseCapture)
			document.body.releaseCapture();

		jsUtils.removeEvent(document, "mousemove", _this.MoveDrag);
		document.onmouseup = null;

		this.floatDiv = null;

		document.onmousedown = null;
		var b = document.body;
		b.ondrag = null;
		b.onselectstart = null;
		b.style.MozUserSelect = _this.floatDiv.style.MozUserSelect = '';
		b.style.cursor = '';
	}

	this.MoveDrag = function(e)
	{
		var x = e.clientX + document.body.scrollLeft;
		_this.SetCursor(x, true);
	}
	
	this.SetCursor = function(position, need_calc)
	{
		this.Init();
		
		if (need_calc == true)
		{
			this.params = jsUtilsPhoto.ObjectsMerge(this.params, jsUtils.GetRealPos(this.field));
			position = parseInt(position);
			position = Math.round((position - this.params['left']) / this.grating_period_px) + 1; 
		}
		
		position = (position < 1 ? 1 : (position > this.gradation ? this.gradation : position));
		
		if (this.current != position)
		{
			this.current = position;
			
			this.checkEvent('BeforeSetCursor', this.current);
			
			if (this.current <= 1)
				this.cursor.style.left = '0';
			else
			{
				var position = Math.round(((this.params['real_width'] * (this.current - 1) / (this.gradation - 1)) / this.params['width']) * 100);
				this.cursor.style.left = position + '%';
			}
			this.cursor.parentNode.style.display = 'none'; 
			this.cursor.parentNode.style.display = 'block'; 
			this.checkEvent('AfterSetCursor', this.current);
		}
	}
	this.checkEvent = function()
	{
		eventName = arguments[0];
		if (this[eventName]) {return this[eventName](arguments); } 
		if (this.events[eventName]) {return this.events[eventName](arguments, this); } 
		return true;
	}
}
bPhotoCursorLoad = true;
/* End */
;; /* /local/lib/frontend/jquery.inputmask/inputmask.js*/
; /* /local/lib/frontend/jquery.inputmask/inputmask.date.extensions.js*/
; /* /local/lib/frontend/jquery.inputmask/inputmask.phone.extensions.js*/
; /* /local/lib/frontend/jquery.inputmask/jquery.inputmask.js*/
; /* /bitrix/components/custom/search.title/script.js*/
; /* /bitrix/templates/.default/components/bitrix/system.auth.form/au_mdl/script.js*/
; /* /bitrix/templates/.default/components/bitrix/menu/verh/script.js*/
; /* /bitrix/templates/.default/components/bitrix/menu/niz/script.js*/
; /* /bitrix/templates/.default/components/bitrix/menu/edu_section/script.js*/
; /* /bitrix/templates/.default/components/custom/photogallery.detail.list/left/script.js*/
; /* /bitrix/components/bitrix/photogallery.detail.list/templates/slider_big/script_cursor.js*/

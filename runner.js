/*!
 JS and Promise utils
 (c) Sean Hogan, 2008,2012,2013,2014,2015
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

(function() {

/*
 ### Utility functions
 These might (or might not) be lodash equivalents
 */

var Meeko = this.Meeko || (this.Meeko = {});
Meeko.stuff = {};

// TODO do string utils needs to sanity check args?
var uc = function(str) { return str ? str.toUpperCase() : ''; }
var lc = function(str) { return str ? str.toLowerCase() : ''; }

var includes = function(a, item) {
	for (var n=a.length, i=0; i<n; i++) if (a[i] === item) return true;
	return false;
}

var forEach = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) fn.call(context, a[i], i, a); }

var some = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) { if (fn.call(context, a[i], i, a)) return true; } return false; }

var every = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) { if (!fn.call(context, a[i], i, a)) return false; } return true; }

var map = function(a, fn, context) {
	var output = [];
	for (var n=a.length, i=0; i<n; i++) {
		var value = a[i];
		output[i] = fn ? 
			fn.call(context, value, i, a) :
			value;
	}
	return output;
}

var filter = function(a, fn, context) {
	var output = [];
	for (var n=a.length, i=0; i<n; i++) {
		var success = fn.call(context, a[i], i, a);
		if (success) output.push(a[i]);
	}
	return output;
}

var find = function(a, fn, context) {
	for (var n=a.length, i=0; i<n; i++) {
		var item = a[i];
		var success = fn.call(context, item, i, a);
		if (success) return item;
	}
}

var words = function(text) { return text.split(/\s+/); }

var forOwn = function(object, fn, context) {
	var keys = Object.keys(object);
	for (var i=0, n=keys.length; i<n; i++) {
		var key = keys[i];
		fn.call(context, object[key], key, object);
	}
}

var isEmpty = function(o) { // NOTE lodash supports arrays and strings too
	if (o) for (var p in o) if (o.hasOwnProperty(p)) return false;
	return true;
}


var defaults = function(dest, src) {
	forOwn(src, function(val, key, object) {
		if (typeof this[key] !== 'undefined') return;
		this[key] = object[key];
	}, dest);
	return dest;
}

var assign = function(dest, src) {
	forOwn(src, function(val, key, object) {
		this[key] = object[key];
	}, dest);
	return dest;
}

assign(Meeko.stuff, {
	uc: uc, lc: lc, words: words, // string
	contains: includes, // FIXME deprecated
	includes: includes, forEach: forEach, some: some, every: every, map: map, filter: filter, find: find, // array
	forOwn: forOwn, isEmpty: isEmpty, defaults: defaults, assign: assign, extend: assign // object
});


var _ = Meeko.stuff;

/*
 ### extend Promise
 */
var Promise = this.Promise;
	
_.defaults(Promise, {

applyTo: function(object) { // short-hand to create a PromiseResolver object
	var resolver = {}
	var promise = new Promise(function(resolve, reject) {
		resolver.resolve = resolve;
		resolver.reject = reject;
	});
	if (!object) object = promise;
	_.assign(object, resolver);
	return promise;
},

isPromise: function(object) {
	return object instanceof Promise;
},

isThenable: function(object) {
	return object && object.then && typeof object.then === 'function';
}

});


/*
 ### Async functions
   asap(fn) returns a promise which is fulfilled / rejected by fn which is run asap after the current micro-task
   delay(timeout) returns a promise which fulfils after timeout ms
   pipe(startValue, [fn1, fn2, ...]) will call functions sequentially
 */
var asap = function(value) { // FIXME asap(fn) should execute immediately
	if (Promise.isPromise(value)) return value;
	if (Promise.isThenable(value)) return Promise.resolve(value); // will defer
	if (typeof value === 'function') 
		return new Promise(function(resolve) { resolve(value()); });
	// NOTE otherwise we have a non-thenable, non-function something
	return Promise.resolve(value); // not-deferred
}

var defer = function(value) {
	if (Promise.isPromise(value)) return value.then();
	if (Promise.isThenable(value)) return Promise.resolve(value);
	if (typeof value === 'function') 
		return Promise.resolve().then(function() { value() });
	// NOTE otherwise we have a non-thenable, non-function something
	return Promise.resolve(value).then();
}

function pipe(startValue, fnList) { // TODO make more efficient with sync introspection
	var promise = Promise.resolve(startValue);
	for (var n=fnList.length, i=0; i<n; i++) {
		var fn = fnList[i];
		promise = promise.then(fn);
	}
	return promise;
}

function reduce(accumulator, a, fn, context) {
return new Promise(function(resolve, reject) {
	var length = a.length;
	var i = 0;

	process(accumulator);
	return;

	function process(acc) {
		while (i < length) {
			if (Promise.isThenable(acc)) {
				acc.then(process, reject);
				return;
			}
			try {
				acc = fn.call(context, acc, a[i], i, a);
				i++;
			}
			catch (error) {
				reject(error);
				return;
			}
		}
		resolve(acc);
	}
});
}

_.defaults(Promise, {
	asap: asap, defer: defer, pipe: pipe, reduce: reduce
});


}).call(this);

/*!
 DOM utils
 (c) Sean Hogan, 2008,2012,2013,2014
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/* NOTE
Requires some features not implemented on older browsers:
element.matchesSelector (or prefixed equivalent) - IE9+
element.querySelectorAll - IE8+
element.addEventListener - IE9+
element.dispatchEvent - IE9+
Object.create - IE9+
*/

(function() {

var window = this;
var document = window.document;

var Meeko = window.Meeko;

var _ = Meeko.stuff;

/*
 ### DOM utility functions
 */

var DOM = Meeko.DOM = (function() {

var getTagName = function(el) {
	return el && el.nodeType === 1 ? _.lc(el.tagName) : '';
}

var matchesSelector;
_.some(_.words('moz webkit ms o'), function(prefix) {
	var method = prefix + 'MatchesSelector';
	if (document.documentElement[method]) {
		matchesSelector = function(element, selector) { return (element && element.nodeType === 1) ? element[method](selector) : false; }
		return true;
	}
	return false;
});


var matches = matchesSelector ?
function(element, selector, scope) {
	if (scope) selector = absolutizeSelector(selector, scope);
	return matchesSelector(element, selector);
} :
function() { throw Error('matches not supported'); } // NOTE fallback

var closest = matchesSelector ?
function(element, selector, scope) {
	if (scope) selector = absolutizeSelector(selector, scope);
	for (var el=element; el && el.nodeType === 1 && el!==scope; el=el.parentNode) {
		if (matchesSelector(el, selector)) return el;
	}
	return;
} :
function() { throw Error('closest not supported'); } // NOTE fallback

function absolutizeSelector(selector, scope) { // WARN does not handle relative selectors that start with sibling selectors
	switch (scope.nodeType) {
	case 1:
		break;
	case 9: case 11:
		// TODO what to do with document / fragment
		return selector;
	default:
		// TODO should other node types throw??
		return selector;
	}
	var id = scope.id;
	if (!id) id = scope.id = uniqueId(scope);
	var scopePrefix = '#' + id + ' ';
	return scopePrefix + selector.replace(/,(?![^(]*\))/g, ', ' + scopePrefix); // COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' unless first followed by LHB '(' 
}

var findId = function(id, doc) {
	if (!id) return;
	if (!doc) doc = document;
	if (!doc.getElementById) throw Error('Context for findId() must be a Document node');
	return doc.getElementById(id);
	// WARN would need a work around for broken getElementById in IE <= 7
}

var findAll = document.querySelectorAll ?
function(selector, node, scope) {
	if (!node) node = document;
	if (!node.querySelectorAll) return [];
	if (scope) {
		if (!scope.nodeType) scope = node; // `true` but not the scope element
		selector = absolutizeSelector(selector, scope);
	}
	return _.map(node.querySelectorAll(selector));
} :
function() { throw Error('findAll() not supported'); };

var find = document.querySelector ?
function(selector, node, scope) {
	if (!node) node = document;
	if (!node.querySelector) return null;
	if (scope) {
		if (!scope.nodeType) scope = node; // `true` but not the scope element
		selector = absolutizeSelector(selector, scope);
	}
	return node.querySelector(selector);
} :
function() { throw Error('find() not supported'); };

var siblings = function(conf, refNode, conf2, refNode2) {
	
	conf = _.lc(conf);
	if (conf2) {
		conf2 = _.lc(conf2);
		if (conf === 'ending' || conf === 'before') throw Error('siblings() startNode looks like stopNode');
		if (conf2 === 'starting' || conf2 === 'after') throw Error('siblings() stopNode looks like startNode');
		if (!refNode2 || refNode2.parentNode !== refNode.parentNode) throw Error('siblings() startNode and stopNode are not siblings');
	}
	
	var nodeList = [];
	if (!refNode || !refNode.parentNode) return nodeList;
	var node, stopNode, first = refNode.parentNode.firstChild;

	switch (conf) {
	case 'starting': node = refNode; break;
	case 'after': node = refNode.nextSibling; break;
	case 'ending': node = first; stopNode = refNode.nextSibling; break;
	case 'before': node = first; stopNode = refNode; break;
	default: throw Error(conf + ' is not a valid configuration in siblings()');
	}
	if (conf2) switch (conf2) {
	case 'ending': stopNode = refNode2.nextSibling; break;
	case 'before': stopNode = refNode2; break;
	}
	
	if (!node) return nodeList; // FIXME is this an error??
	for (;node && node!==stopNode; node=node.nextSibling) nodeList.push(node);
	return nodeList;
}

var contains = // WARN `contains()` means contains-or-isSameNode
document.documentElement.contains && function(node, otherNode) {
	if (node === otherNode) return true;
	if (node.contains) return node.contains(otherNode);
	if (node.documentElement) return node.documentElement.contains(otherNode); // FIXME won't be valid on pseudo-docs
	return false;
} ||
document.documentElement.compareDocumentPosition && function(node, otherNode) { return (node === otherNode) || !!(node.compareDocumentPosition(otherNode) & 16); } ||
function(node, otherNode) { throw Error('contains not supported'); };

function dispatchEvent(target, type, params) { // NOTE every JS initiated event is a custom-event
	if (typeof type === 'object') {
		params = type;
		type = params.type;
	}
	var bubbles = params && 'bubbles' in params ? !!params.bubbles : true;
	var cancelable = params && 'cancelable' in params ? !!params.cancelable : true;
	if (typeof type !== 'string') throw Error('trigger() called with invalid event type');
	var detail = params && params.detail;
	var event = document.createEvent('CustomEvent');
	event.initCustomEvent(type, bubbles, cancelable, detail);
	if (params) _.defaults(event, params);
	return target.dispatchEvent(event);
}


var insertNode = function(conf, refNode, node) { // like imsertAdjacentHTML but with a node and auto-adoption
	var doc = refNode.ownerDocument;
	if (doc.adoptNode) node = doc.adoptNode(node); // Safari 5 was throwing because imported nodes had been added to a document node
	switch(conf) {

	case 'before':
	case 'beforebegin': refNode.parentNode.insertBefore(node, refNode); break;

	case 'after':
	case 'afterend': refNode.parentNode.insertBefore(node, refNode.nextSibling); break;

	case 'start':
	case 'afterbegin': refNode.insertBefore(node, refNode.firstChild); break;

	case 'end':
	case 'beforeend': refNode.appendChild(node); break;

	case 'replace': refNode.parentNode.replaceChild(node, refNode); break;

	case 'empty':
	case 'contents': 
		// TODO DOM.empty(refNode);
		var child;
		while (child = refNode.firstChild) refNode.removeChild(child);
		refNode.appendChild(node);
		break;
	}
	return refNode;
}

var cloneContents = function(parentNode) {
	doc = parentNode.ownerDocument;
	var frag = doc.createDocumentFragment();
	var node;
	while (node = parentNode.firstChild) frag.appendChild(node);
	return frag;
}
	
var adoptContents = function(parentNode, doc) {
	if (!doc) doc = document;
	var frag = doc.createDocumentFragment();
	var node;
	while (node = parentNode.firstChild) frag.appendChild(doc.adoptNode(node));
	return frag;
}
	
/* 
NOTE:  for more details on how checkStyleSheets() works cross-browser see 
http://aaronheckmann.blogspot.com/2010/01/writing-jquery-plugin-manager-part-1.html
TODO: does this still work when there are errors loading stylesheets??
*/
// TODO would be nice if this didn't need to be polled
// TODO should be able to use <link>.onload, see
// http://stackoverflow.com/a/13610128/108354
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
var checkStyleSheets = function() { 
	// check that every <link rel="stylesheet" type="text/css" /> 
	// has loaded
	return _.every(DOM.findAll('link'), function(node) {
		if (!node.rel || !/^stylesheet$/i.test(node.rel)) return true;
		if (node.type && !/^text\/css$/i.test(node.type)) return true;
		if (node.disabled) return true;
		
		// handle IE
		if (node.readyState) return readyStateLookup[node.readyState];

		var sheet = node.sheet || node.styleSheet;

		// handle webkit
		if (!sheet) return false;

		try {
			// Firefox should throw if not loaded or cross-domain
			var rules = sheet.rules || sheet.cssRules;
			return true;
		} 
		catch (error) {
			// handle Firefox cross-domain
			switch(error.name) {
			case 'NS_ERROR_DOM_SECURITY_ERR': case 'SecurityError':
				return true;
			case 'NS_ERROR_DOM_INVALID_ACCESS_ERR': case 'InvalidAccessError':
				return false;
			default:
				return true;
			}
		} 
	});
}


return {
	getTagName: getTagName,
	contains: contains, matches: matches,
	findId: findId, find: find, findAll: findAll, closest: closest, siblings: siblings,
	dispatchEvent: dispatchEvent,
	cloneContents: cloneContents, adoptContents: adoptContents,
	insertNode: insertNode, 
	checkStyleSheets: checkStyleSheets
}

})();


}).call(this);
/*
 * Interceptor
 * Copyright 2012-2015 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */


/* TODO
	+ hide (at runtime) / show (after stylesheets loaded)
 */

(function() {

var DEFAULT_TRANSFORM_ID = '_default';


var window = this;
var document = window.document;

var Meeko = window.Meeko;
var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var Promise = window.Promise;

var domLoaded = (function() {
// WARN this function assumes document.readyState is available

var loaded = false;
var complete = false;

var domLoaded = Promise.applyTo();

// See https://gist.github.com/shogun70/5388420 
// for testing document.readyState in different browsers
if (/loaded|complete/.test(document.readyState)) {
	loaded = true;
	domLoaded.resolve();
}
else document.addEventListener('DOMContentLoaded', onLoaded, true);

if (/complete/.test(document.readyState)) {
	complete = true;
	domLoaded.resolve();
}
else window.addEventListener('load', onComplete, true);

return domLoaded;

function onLoaded(e) {
	loaded = true;

	// now cloak the event
	if (e.stopImmediatePropagation) e.stopImmediatePropagation();
	else e.stopPropagation();

	document.removeEventListener('DOMContentLoaded', onLoaded, true);
	domLoaded.resolve();
}

function onComplete(e) {
	complete = true;
	window.removeEventListener('load', onComplete, true);

	onLoaded(e); // most of onLoaded also applies in onComplete
}


})();


var interceptor = Meeko.interceptor = {};

var started = false;
domLoaded.then(function() { // fallback
	if (!started) interceptor.start({
		
	});
});

_.assign(interceptor, {

DEFAULT_TRANSFORM_ID: DEFAULT_TRANSFORM_ID,

start: function(options) {
	if (started) {
		console.warn('Ignoring repeated call to interceptor.start()');
		return;
	}
	started = true;

	var url = document.referrer;
	if (!url) return; // FIXME default url-to-load option??
	
	var interceptor = this;

	history.replaceState(null, url, url);
	document.title = url;

	var docFu = interceptor.fetch(url);

	return Promise.pipe(domLoaded, [

	function() { return options && options.waitUntil; },

	function() {
		if (!interceptor.getTransformer(DEFAULT_TRANSFORM_ID)) {
			interceptor.registerTransformer(DEFAULT_TRANSFORM_ID, {
				type: 'body'
			});
		}
	},
	
	function() {
		return docFu;
	},

	function(doc) {
		history.replaceState(null, doc.title, url); // FIXME implement `state` management
		document.title = doc.title;
		return interceptor.transclude(doc, DEFAULT_TRANSFORM_ID, 'replace', document.body);
	},

	function() {
		// TODO ensure these fake events are not cloaked by the domLoaded functionality
		DOM.dispatchEvent(document, 'DOMContentLoaded');
		return wait(DOM.checkStyleSheets)
		.then(function() {
			DOM.dispatchEvent(window, 'load');
		});
	}

	]);
},

transclude: function(url, transformId, position, refNode, details) {
	var interceptor = this;

	return Promise.pipe(url, [
	function(url) {
		if (url.nodeType) return url;
		return interceptor.fetch(url);
	},
	function(frag) {
		return interceptor.transform(frag, transformId, details);
	},
	function(frag) {
		// FIXME fallback when content not found
		DOM.insertNode(position, refNode, frag);
	}
	]);	

},

transform: function(frag, transformId, details) {
	var interceptor = this;
	var transformerList = interceptor.getTransformer(transformId);
	return Promise.reduce(frag, transformerList, function(fragment, transformer) {
		return transformer.transform(fragment, details);
	})
	.then(function(frag) {
		if (frag.ownerDocument === document) return frag;
		// NOTE When inserting Custom-Elements into `document` 
		// Chrome doesn't call createdCallback() when adoptNode() is used
		return document.importNode(frag, true); 
	});
},

fetch: function(url) {
return new Promise(function(resolve, reject) {
	var xhr = new XMLHttpRequest;
	xhr.responseType = 'document';
	xhr.open('get', url, true);
	xhr.onload = function() {
		var xhr = this;
		if (xhr.status !== 200) { // TODO other response codes
			try { throw Error('XHR failed. url: ' + url + ' status: ' + xhr.status); }
			catch(err) { reject(err); }
		}
		resolve(xhr.response);
	}
	xhr.send();
});

}


});

var frameRate = 60;
var frameInterval = 1000/frameRate;

function wait(test) {
return new Promise(function(resolve) {
	poll(test, resolve);	
});
}

function poll(test, callback) {
	if (test()) callback();
	else setTimeout(function() { poll(test, callback); }, frameInterval);
}


// SimpleTransformer
var Transformer = function(type, template, format, options) {
	var transformer = this;
	var processor = transformer.processor = interceptor.createProcessor(type, options);
	if (template != null) processor.loadTemplate(template);
	transformer.format = format;
}

_.assign(Transformer.prototype, {

transform: function(srcNode, details) {
	var transformer = this;
	var provider = {
		srcNode: srcNode
	}
	if (transformer.format) {
		provider = interceptor.createDecoder(transformer.format);
		provider.init(srcNode);
	}
	return transformer.processor.transform(provider, details);
}

});

_.assign(interceptor, {

transformers: {},

registerTransformer: function(defId, defList) {
	if (!Array.isArray(defList)) defList = [ defList ];
	this.transformers[defId] = _.map(defList, function(def) {
		// create simple transformer
		return new Transformer(def.type, def.template, def.format, def.options);
	});
},

getTransformer: function(defId) {
	return this.transformers[defId];
},

decoders: {},

registerDecoder: function(type, constructor) {
	this.decoders[type] = constructor;
},

createDecoder: function(type, options) {
	return new this.decoders[type](options);
},

processors: {},

registerProcessor: function(type, constructor) {
	this.processors[type] = constructor;
},

createProcessor: function(type, options) {
	return new this.processors[type](options, this.filters);
},

registerFilter: function(name, fn) {
	this.filters.register(name, fn);
}

});

}).call(this); // WARN don't change. This matches var declarations at top

/*
 * Processors and Decoders
 * Copyright 2014-2015 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* TODO
	+ XSLT transforms (in processors.js)
 */

(function(classnamespace) {

var window = this;
var document = window.document;

var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var Task = Meeko.Task;
var Promise = Meeko.Promise;
var interceptor = Meeko.interceptor;

var BodyProcessor = (function() {

function BodyProcessor(options, framesetDef) {
	this.options = options; // FIXME should be shallow copy
}

_.defaults(BodyProcessor.prototype, {

loadTemplate: function(template) {
	if (template) console.warn('"body" transforms do not use templates');
},

transform: function(provider, details) { // TODO how to use details?
	var srcNode = provider.srcNode;
	var srcDoc = srcNode.nodeType === 9 ? srcNode : srcNode.ownerDocument;
	if (srcNode === srcDoc) return srcDoc.body;
	if (srcNode === srcDoc.body) return srcNode;

	// FIXME what about ancestor-nodes of <body> or nodes in <head>
	var body = srcDoc.createElement('body');
	body.appendChild(srcNode);
	return body;
}
	
});

return BodyProcessor;
})();

interceptor.registerProcessor('body', BodyProcessor);

var MainProcessor = (function() {

function MainProcessor(options, framesetDef) {
	this.options = options; // FIXME should be shallow copy
}

_.defaults(MainProcessor.prototype, {

loadTemplate: function(template) {
	if (template) console.warn('"main" transforms do not use templates');
},

transform: function(provider, details) { // TODO how to use details?
	var srcNode = provider.srcNode;
	var srcDoc = srcNode.nodeType === 9 ? srcNode : srcNode.ownerDocument;
	var main;
	if (!main && DOM.matches(srcNode, 'main, [role=main]')) main = srcNode;
	if (!main) main = DOM.find('main, [role=main]', srcNode);
	if (!main && srcNode === srcDoc.body) main = srcNode;
	if (!main && srcNode === srcDoc) main = srcDoc.body;
	// FIXME what about ancestor-nodes of <body> or nodes in <head>
	if (!main) main = srcNode;

	if (this.options && this.options.inclusive) return main;

	var frag = srcDoc.createDocumentFragment();
	var node;
	while (node = main.firstChild) frag.appendChild(node); // NOTE no adoption
	return frag;
}
	
});

return MainProcessor;
})();

interceptor.registerProcessor('main', MainProcessor);


var ScriptProcessor = (function() {

function ScriptProcessor(options, framesetDef) {
	this.frameset = framesetDef;
	this.options = options; // FIXME should be shallow copy
}

_.defaults(ScriptProcessor.prototype, {

loadTemplate: function(template) {
	if (!template) {
		console.warn('"script" transform template not defined');
		return;
	}
	if (!(typeof template === 'function' || typeof template.transform === 'function')) {
		console.warn('"script" transform template not valid');
		return;
	}
	this.processor = template;
},

transform: function(provider, details) {
	var srcNode = provider.srcNode;
	if (!this.processor) {
		console.warn('"script" transform template not valid');
		return;
	}
	if (typeof this.processor === 'function') 
		return this.processor(srcNode, details);
	return this.processor.transform(srcNode, details);
}
	
});


return ScriptProcessor;
})();

interceptor.registerProcessor('script', ScriptProcessor);


_.assign(classnamespace, {

BodyProcessor: BodyProcessor,
MainProcessor: MainProcessor,
ScriptProcessor: ScriptProcessor,

});


}).call(this, Meeko.interceptor);
(function() {

var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var interceptor = Meeko.interceptor;

/* 
	Transcluder setup
*/

var TRANSCLUDE_TAG = 'meeko-transclude';
var TranscludeElement;

(window.AMP = window.AMP || []).push(function() {
	registerTranscluder();
});

// FIXME transcluder needs to hook into AMP's lazy-loading
function registerTranscluder() {
	TranscludeElement = document.registerElement(TRANSCLUDE_TAG, { prototype: HTMLElement.prototype });

	// FIXME should have at least a readonly `src` property
	// FIXME only performs transclusion first time enters document
	_.assign(TranscludeElement.prototype, {
		attachedCallback: function() {
			var element = this;
			if (!element.hasAttribute('src')) return;
			var src = element.getAttribute('src');
			src = resolveURL(src);
			var details = {};
			// TODO allow alternate-transforms and fragment-identifiers (in details)
			interceptor.transclude(src, interceptor.DEFAULT_TRANSFORM_ID, 'empty', element, details);
		}
	});
}

function resolveURL(relURL) {
	var a = document.createElement('a');
	a.setAttribute('href', relURL);
	return a.href;
}


/*
	Transformer setup
*/

// TODO a more flexible transform / translate engine. XSLT possibly
var translations = {
	'img': 'amp-img',
	'video': 'amp-video',
	'marquee': 'amp-carousel'
}

var embedTranslations = {
	'image': 'amp-img',
	'video': 'amp-video',
	'content': TRANSCLUDE_TAG
}


var ampTransformer = function(doc, details) {
	var srcTag;
	_.forOwn(translations, function(srcTag) {
		var tag = translations[srcTag];
		_.forEach(DOM.findAll(srcTag, doc), function(srcNode) {
			var node = doc.createElement(tag);
			_.forEach(srcNode.attributes, function(attr) {
				node.setAttribute(attr.name, attr.value);
			});
			var child;
			while (child = srcNode.firstChild) node.appendChild(child);
			srcNode.parentNode.replaceChild(node, srcNode);
		});
	});

	srcTag = 'a[href][rel~=embed], link[href][rel~=embed]';
	_.forEach(DOM.findAll(srcTag, doc), function(srcNode) {
		var relations = srcNode.rel.split(/\s+/);
		var type = _.find(relations, function(rel) { // TODO warn on multiple matching types
			rel = rel.toLowerCase();
			return (rel in embedTranslations);
		});
		if (!type) return;

		var tag = embedTranslations[type];
		var node = doc.createElement(tag);
		_.forEach(srcNode.attributes, function(attr) {
			var value = attr.value;
			var name = attr.name;
			if (name === 'href') name = 'src';
			node.setAttribute(name, value);
		});

		switch (tag) {
		case 'amp-img':
			node.setAttribute('alt', srcNode.textContent); // TODO should be .innerText
			break;

		case TRANSCLUDE_TAG: // TODO @main ??
		default:
			var child;
			while (child = srcNode.firstChild) node.appendChild(child);
			break;
		}

		srcNode.parentNode.replaceChild(node, srcNode);
	});
	
	return doc;
}

interceptor.registerTransformer(interceptor.DEFAULT_TRANSFORM_ID, [
	{ type: 'script', template: ampTransformer },
	{ type: 'body' }
]);

})();

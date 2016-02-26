(function() {

var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var transforms = Meeko.transforms;
var interceptor = Meeko.interceptor;

/* 
	Transcluder setup
*/

var TRANSCLUDE_TAG = 'meeko-transclude';
var PRERENDER_TAG = 'meeko-prerender';

var TranscludeElement;
var PrerenderElement;

(window.AMP = window.AMP || []).push(function() {
	registerTranscluder();
	registerPrerender();
});

// FIXME transcluder needs to hook into AMP's lazy-loading
function registerTranscluder() {
	TranscludeElement = function(element) {
		AMP.BaseElement.call(this, element);
	}

	// FIXME should have at least a readonly `src` property
	// FIXME only performs transclusion first time enters document
	_.assign(TranscludeElement.prototype, {
		isLayoutSupported: function(layout) {
			return layout === 'fixed' || layout === 'fixed-height' || layout === 'fill';
		},

		layoutCallback: function() {
			var element = this.element;
			if (!element.hasAttribute('src')) return;
			var src = element.getAttribute('src');
			// FIXME need a URLUtils implementation
			src = resolveURL(src);
			var srcParts = src.split('#'); 
			var src = srcParts[0];
			var hash = srcParts[1];
			var details = {};
			if (hash) details.main = '#' + hash;
			// TODO allow alternate-transforms and fragment-identifiers (in details)
			return interceptor.transclude(src, TRANSCLUDE_TAG, 'empty', element, details);
		}
	});

	AMP.registerElement(TRANSCLUDE_TAG, TranscludeElement);
}

// FIXME prerender needs to hook into AMP's lazy-loading
function registerPrerender() {
	PrerenderElement = function(element) {
		AMP.BaseElement.call(this, element);
	}

	PrerenderElement.prototype = Object.create(AMP.BaseElement.prototype);

	_.assign(PrerenderElement.prototype, {
		renderOutsideViewport: function() {
			return false;
		},

		isLayoutSupported: function(layout) {
			return true;
		},

		buildCallback: function() {
			this.element.style.position = 'absolute';
			this.element.style.zIndex = -1;
			this.element.style.opacity = '0';
			this.element.style.width = '1px';
			this.element.style.height = '1px';
		},

		isRelayoutNeeded: function() {
			return false;
		},

		layoutCallback: function() {
	  		// Now that we are rendered, stop rendering the element to reduce
			// resource consumption.
			this.element.style.width = 0;
			this.element.style.height = 0;
			return Promise.resolve();
		},

		viewportCallback: function(leaving) {
			var element = this.element;
			var src = element.getAttribute('src');
			if (!src) return Promise.resolve();
			// FIXME need a URLUtils implementation
			src = resolveURL(src);
			var srcParts = src.split('#'); 
			var src = srcParts[0];
			var hash = srcParts[1];
			var details = {};
			if (hash) details.main = '#' + hash;
			// TODO allow alternate-transforms and fragment-identifiers (in details)
			return interceptor.prerender(src, interceptor.getDefaultTransform(), details);
		}
	});

	AMP.registerElement(PRERENDER_TAG, PrerenderElement);

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
	_.forOwn(translations, function(tag, srcTag) {
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

transforms.set(interceptor.getDefaultTransform(), [
	{ type: 'script', template: ampTransformer },
	{ type: 'body' }
]);

transforms.set(TRANSCLUDE_TAG, [
	{ type: 'script', template: ampTransformer },
	{ type: 'main' }
]);


})();

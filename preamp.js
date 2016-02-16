(function() {

var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var transforms = Meeko.transforms;
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
	TranscludeElement = document.registerElement(TRANSCLUDE_TAG, { 
		prototype: Object.create(HTMLElement.prototype) 
	});

	// FIXME should have at least a readonly `src` property
	// FIXME only performs transclusion first time enters document
	_.assign(TranscludeElement.prototype, {
		attachedCallback: function() {
			var element = this;
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
			interceptor.transclude(src, TRANSCLUDE_TAG, 'empty', element, details);
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

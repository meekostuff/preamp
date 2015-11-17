(function() {

var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var interceptor = Meeko.interceptor;

var translations = {
	'img': 'amp-img',
	'video': 'amp-video',
	'marquee': 'amp-carousel'
}

var ampTransformer = function(doc, details) {
	for (var srcTag in translations) {
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
	}
	
	return doc;
}

interceptor.registerTransformer(interceptor.DEFAULT_TRANSFORM_ID, [
	{ type: 'script', template: ampTransformer },
	{ type: 'body' }
]);

})();

preAMP
======

Use the AMP-HTML engine without giving up on valid HTML.

**WARNING:** This project is still experimental. 
Expect usage to change and the documentation to be out-of-date.

**DO NOT USE IN PRODUCTION**


Overview
--------

**Question:** Can you create an AMP site without giving up on valid HTML content?

1. **No.** AMP dictates that your pages must replace some valid HTML tags with AMP-specified custom-elements.

2. **Yes,** if you pre-process your valid HTML into AMP-HTML before the AMP engine initialiszes. 

Implementing pre-processing would be fairly straight-forward except that modern browsers implement resource prefetching during page load, even of resources that the pre-processing might remove or disable. <small>( Working-around this prefetching is, in fact, one of the main reasons for AMP-HTMLs existence. The most commonly used AMP-HTML tag is `<amp-img>` to replace `<img>`. )</small>) 

preAMP works around this prefetching by *redirecting* the browser to a **viewer-page** to cancel the prefetching and implement preprocessing of the landing-page's content to use AMP-HTML. All AMP scripts go in the viewer-page rather than the content page. 

**NOTE:** preAMP is actually a small extension to [Interception](https://github.com/meekostuff/interception). The project page for Interception is also instructive.

**TODO:** Overview should go in a separate page or a wiki.


### Browser support

Like AMP, preAMP requires features only available in recent versions of popular browsers. 
It will not even start on unsupported browsers 
so the fallback behavior of pages is simply defined by their own styles and scripts 
rather than the viewer page. 

preAMP can run on browsers which support `history.pushState`, native `XMLHttpRequest` and (for now) native `Promise`.
These are available on recent versions of browsers in significant use today,
except that Promises are not available on IE - they are only implemented in Edge.

**WARN:** Ideally preAMP would precheck that the viewer-page and all its stylesheets, fonts, scripts, etc were downloadable and valid / appropriate for the current browser. 


### License

preAMP is available under 
[MPL 2.0](http://www.mozilla.org/MPL/2.0/ "Mozilla Public License version 2.0").
See the [MPL 2.0 FAQ](http://www.mozilla.org/MPL/2.0/FAQ.html "Frequently Asked Questions")
for your obligations if you intend to modify or distribute preAMP or part thereof. 
preAMP depends on [Interception](https://github.com/meekostuff/interception)
which is available under the same terms.

See the [AMP-HTML project](https://github.com/ampproject/amphtml) 
for licensing terms of AMP resources.


### Contact

If you have any questions or comments, don't hesitate to contact the author via
[web](http://meekostuff.net/), [email](mailto:shogun70@gmail.com) or [twitter](http://twitter.com/meekostuff). 


Installation
------------

1. Copy or clone the preAMP project files to a sub-directory of your domain on your server, say 
	
		path/to/preamp/

2. Open a **supported** browser and navigate to the following page
	
		http://your.domain.com/path/to/preamp/test/page1.html
	
	Visually inspect the displayed page for the following possible failures:
	
	- text indicating that it is from the viewer page
	- **TODO:** the test-pages are minimally useful
	
3. Create a viewer page with styles and scripts but no content.
Source the preAMP runner-script with this line in the `<head>`
	
		<script src="/path/to/preamp/preamp_runner.js"></script>
		
	The runner-script 
	- MUST be in the `<head>` of the page
	- MUST NOT have `@async` or `@defer`
	- MUST be before any scripts
	- MUST be before any stylesheets - `<link rel="stylesheet" />` or `<style>`

4. Source the preAMP boot-script into your pages with this line in the `<head>` of each page 
	
		<script src="/path/to/preamp/boot.js"></script>
		
	The boot-script 
	- MUST be in the `<head>` of the page
	- MUST NOT have `@async` or `@defer`
	- MUST be before any scripts
	- MUST be before any stylesheets - `<link rel="stylesheet" />` or `<style>`

More details in [Boot Configuration](#boot-configuration).


Quick Start
-----------

Create a HTML document (page.html) with some page specific content. 
Any page specific scripts, styles or meta-data should go in `<head>`. 

    <!DOCTYPE html>
	<html manifest="/viewer.html"><!-- @manifest is the link to the viewer page -->
	<head>
		<!-- source the preAMP boot-script -->
		<script src="/path/to/preamp/boot.js"></script>
		<title>Page One</title>
		<!-- include fallback stylesheets for when preAMP doesn't run. -->
		<style>
		.styled-from-page { background-color: red; color: white; }
		</style>
	</head>
	<body>

		<main><!-- Primary content -->
			<h1>Page One<h1>
			<img src="image.jpg" />
			<div class="styled-from-viewer">
			This content is styled by the viewer stylesheet
			</div>	
			<div class="styled-from-page">
			This content is styled by the page stylesheet which will not apply in the viewer. 
			</div>	
		</main>
		
	</body>
	</html>
	
Create the viewer document (viewer.html).
This is a normal page of HTML that, when viewed in the browser,
will appear as the final page without the page specific content. 

	<!DOCTYPE html>
	<html>
	<head>
		<!-- source the preAMP runner-script -->
		<script src="/path/to/preamp/preamp_runner.js"></script>
		<!-- source AMP scripts. No @async -->
		<script src="/path/to/preamp/amp/v0.js"></script>
		<script custom-element="amp-fit-text" src="/path/to/preamp/amp/v0/amp-fit-text-0.1.js"></script>
		<script custom-element="amp-carousel" src="/path/to/preamp/amp/v0/amp-carousel-0.1.js"></script>
		<style>
		.styled-from-viewer { border: 2px solid blue; }
		</style>
	</head>
	<body>
	</body>
	</html>

When page.html is loaded into the browser, preAMP will redirect to viewer.html and then load and merge page.html using AJAX,
replacing the `<body>` of viewer.html with that of page.html.

This process results in a DOM tree something like this:

	<!DOCTYPE html>
	<html>
	<head>
		<!-- source the preAMP runner-script -->
		<script src="/path/to/preamp/preamp_runner.js"></script>
		<!-- source AMP scripts. No @async -->
		<script src="/path/to/preamp/amp/v0.js"></script>
		<script custom-element="amp-fit-text" src="/path/to/preamp/amp/v0/amp-fit-text-0.1.js"></script>
		<script custom-element="amp-carousel" src="/path/to/preamp/amp/v0/amp-carousel-0.1.js"></script>
		<style>
		.styled-from-viewer { border: 2px solid blue; }
		</style>
		<title>Page One</title>
		<!-- NOTE: no page specific style -->
	</head>
	<body>

		<main><!-- Primary content -->
			<h1>Page One<h1>
			<amp-img src="image.jpg"></amp-img>
			<div class="styled-from-viewer">
			This content is styled by the viewer stylesheet
			</div>	
			<div class="styled-from-page">
			This content is styled by the page stylesheet which will not apply in the viewer. 
			</div>	
		</main>

	</body>
	</html>


Preprocessing
-------------

This section lists the AMP-HTML elements and what HTML elements are translated to them.
**WARN:** Expect this section to change / expand.

### `<amp-img>`

1. `<img>`: all attributes copied


### `<amp-video>`

1. `<video>`: all attributes copied


### `<amp-carousel>`

1. `<marquee>`: all attributes copied


Boot Configuration
------------------

### Preparation

Assuming the default [installation](#installation) was successful,
use these steps to prepare for site specific configuration.

1. Copy `viewer.html` from the preamp directory to the root directory of your domain.

	If you have unix shell access to the domain's server 

			cd /directory/of/your/domain
			cp path/to/preamp/viewer.html .
	
2. Edit the viewer page to source the preamp runner-script, replacing this line
	
		<script src="./preamp_runner.js"></script>
	
	with this line

		<script src="/path/to/preamp/preamp_runner.js"></script>

	Also update the path to other scripts, including AMP scripts.
	
3. Copy `options.js` from the preamp directory to the root directory of your domain.
	
			cp path/to/preamp/options.js .

4. Concatenate your modified `options.js` with `boot.js` from the preamp directory
and store in `boot.js` of the root directory.
	
			cat options.js path/to/preamp/boot.js > boot.js

5. Source the modified preamp boot-script into your pages -
preferably before any stylesheets - 
with this line in the `<head>` of each page 
	
			<script src="/boot.js"></script>


Now you have a simple setup allowing you to:

- modify your options without affecting the preamp installation, and
- update preamp without overwriting your options.

When you want to:

+ modify options
	- edit your copy of `options.js`
	- repeat step 4 to rebuild your boot-script

+ update preamp
	- overwrite the preamp directory with the latest version
	- repeat step 4

+ minify boot.js
	- minify boot.js to boot.min.js in the path/to/preamp directory
	- repeat step 4 with `path/to/preamp/boot.min.js`


Details of boot options available can be found in [Interception: Boot options](https://github.com/meekostuff/interception#boot-options).


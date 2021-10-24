const path = require("path");
const fs = require("fs");

module.exports = function(config) {

	/**
	 * Register passthrough to the public folder.
	 * 
	 * This copies all media files stored in the components to the correct
	 * location in the public folder and also watches the assets folder when
	 * you are developing.
	 */
	config.addPassthroughCopy("./assets/**/*.{jpg,gif,png,svg}");
	config.addPassthroughCopy("./assets/**/*.{eot,ttf,woff,woff2}");
	config.addPassthroughCopy("./assets/**/*.{js,json}");
	config.addWatchTarget("./assets");

	config.addLayoutAlias("page", "layouts/page/page.html");

	// === START OF THE DEMO =================================================

	/**
	 * 
	 * 
	 */
	config.addNunjucksTag("render", function(nunjucksEngine) {
		return new function() {
			this.tags = ["render"];
			this._components = JSON.parse(
				fs.readFileSync(path.resolve(process.cwd(), "components.json"))
			);

			this.parse = function (parser, nodes, lexer) {
				let tok = parser.nextToken();
				let args = parser.parseSignature(null, true);

				parser.advanceAfterBlockEnd(tok.value);

				return new nodes.CallExtensionAsync(this, "run", args);
      		};

      		this.run = function (context, handle, data={}, partial=false, callback) {
				if (!(handle in this._components)) {
					return callback(`Component '${handle}' not found!`);
				}

				let component = this._components[handle];
				let ctx = data;

				if (partial) {
					ctx = Object.assign({}, component.ctx, data);
				}

				let result = context.env.render(component.path, ctx)
				callback(null, new nunjucksEngine.runtime.SafeString(result));
      		};
    	}();
  	});

	// === END OF THE DEMO ===================================================

	// This is the fastest way to not clash with the browser sync server from fractal
	// There is probaply a better way but I don't care for this demo.
	config.setBrowserSyncConfig({ ui: false });

	return { 
		pathPrefix: "/",
		dataTemplateEngine: "njk",
		markdownTemplateEngine: "njk",
		htmlTemplateEngine: "njk",
		passthroughFileCopy: true,
		dir: {
			// This is where eleventy finds the content
			input: "./content",

			// This is where eleventy should put all the generated files
			output: "./public",

			// Eleventy loads partials relative to the content directory
			includes: "../assets",

			// Eleventy loads templates relative to the content directory
			layouts: "../assets"
		}
	};
};

/**
 * Just some sugar to have error pages in serve mode. 
 */
function browserSyncReady(err, bs) {
	bs.addMiddleware("*", (req, res) => {
		const content_404 = fs.readFileSync('public/errors/404.html');

		// Provides the 404 content without redirect.
		res.write(content_404);

		// Add 404 http status code in request header.
		// res.writeHead(404, { "Content-Type": "text/html" });
		res.writeHead(404);
		res.end();
	});
}
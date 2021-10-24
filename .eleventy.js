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

	class RenderExtension {
		constructor(engine) {
			this.engine = engine;
			this.tags = ["render"];
			this._components = JSON.parse(
				fs.readFileSync(path.resolve(process.cwd(), "components.json"))
			);
		}

		parse(parser, nodes, lexer) {
			let tok = parser.nextToken();
			let args = parser.parseSignature(null, true);

			parser.advanceAfterBlockEnd(tok.value);
			return new nodes.CallExtension(this, "run", args);
		};

		/**
		 * Renders a component like from a fractal component library.
		 * 
		 * This requires a map of components in form of `components.json` file to be placed
		 * in the root directory of the project.
		 * 
		 * When everything is fine you can use `{% render '@myHandle', {name: "schnick"}, true %}`
		 * in your templates – like you are used to from fractal.
		 * 
		 * @param {object} context - The current context from nunjucks
		 * @param {string} handle - The handle of the component you want to use e.g `@my-component--best-variant`
		 * @param {object} data - The data you want to put into this component
		 * @param {boolean} partial - Whether that data is the full set or just some parts (default: false)
		 */
		run(context, handle, data={}, partial=false) {
			if (!(handle in this._components)) {
				throw new Error(`Component '${handle}' not found!`);
			}

			let component = this._components[handle];
			let ctx = data;

			if (partial) {
				ctx = Object.assign({}, component.ctx, data);
			}

			let result = context.env.render(component.path, ctx, function (error) {
				if (error) {
					throw new Error(`Failed to render component '${handle}'.`, error);
				}
			});
			return new this.engine.runtime.SafeString(result);
		};
	};

	config.addNunjucksTag("render", function(nunjucksEngine) {
		return new RenderExtension(nunjucksEngine);
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

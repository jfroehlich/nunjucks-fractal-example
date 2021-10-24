Nunjucks / Fractal example
================================================================================

It's not very obvious how you could integrate components from fractal into an
already existing site. This project is a working demo to show how fractal
components could be integrated into the site without changing anything in the
components.

Installation and usage
--------------------------------------------------------------------------------

Just run `npm install`. fractal and eleventy should be ready to use after that.

- `npm run watch:fractal` launches the fractal UI on port 3000. Feel free to
  look around.

- `npm run watch:eleventy` starts eleventy compiling, serving and watching the
  site on port 8080. It's not much but you maybe get the point.

- `npx fractal components-file` uses the custom command to write the components
  file to the project root folder.


How it's done
--------------------------------------------------------------------------------

With a custom function inside `fractal.config.js` fractal writes a
`components.json` file into the projects root directory on initial loads and on
changes to the components. The json file maps the component's handle to the
relative template path and the predefined context data.

A custom `render` tag inside `.eleventy.js` reads the `components.json` file and
renders the component with the provided data or the predefined data – exactly
like fractals `render` tag does.

### The fractal function

The function inside `fractal.config.js` write an updated `components.json` file on
each change or on the initial load. In the example below it is also registered as a
custom command:

```javascript
const fs = require("fs");

function makeComponentsMap(app) {
	const componentsMap = {};

	// build a map of all components
	for (let item of app.components.flatten()) {
		// put the "simple" component into the map
		componentsMap["@" + item.handle] = {path: item.relViewPath, ctx: item.context};

		// iterate the variants array and put all the variants in the map, too
		for (let variant of item.variants()) {
			componentsMap["@" + variant.handle] = {path: variant.relViewPath, ctx: variant.context};
		}
	}

	try {
		// write the map to the current working directory which should be the root of the project
		fs.writeFileSync(`${process.cwd()}/components.json`, JSON.stringify(componentsMap))
	} catch (error) {
		console.error(error);
	}
}

/**
 * A custom command to write a json file with all components and context
 * to the current working directory.
 */
fractal.cli.command("components-file", function (args, done) {
	makeComponentsMap(this.fractal);
	done();
}, {description: "Create a json file with all json components in the working directory."});

// run the command after the initial load
fractal.on("source:loaded", function () {
	makeComponentsMap(fractal);
});

// run the command after the components were updated after a change
fractal.on("source:updated", function () {
	makeComponentsMap(fractal);
});
```

The content of the `components.json` file looks something like this:

```json
{
    "@myHandle": {
        "path": "path/to/the/component-template.html",
        "ctx": {"text": "Predefined sample text"}
    }
}
```

Having this file as a static ressource has the benefit that target systems do
not necessarily have to install fractal and it's dependencies in order to use
the components.

### The nunjucks extension

nunjucks as was chosen as example template engine since others like twig,
handlebars, django, jinja2, liquid, etc are very similar.

```javascript
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
        return new nodes.CallExtensionAsync(this, "run", args);
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
     * @param {function} callback - The callback from nunjucks which is called when the function is done
     */
    run(context, handle, data={}, partial=false, callback) {
        if (!(handle in this._components)) {
            return callback(`Component '${handle}' not found!`);
        }

        let component = this._components[handle];
        let ctx = data;

        if (partial) {
            ctx = Object.assign({}, component.ctx, data);
        }

        let result = context.env.render(component.path, ctx)
        callback(null, new this.engine.runtime.SafeString(result));
    };
};

// This registers the tag for nunjucs inside eleventy.
config.addNunjucksTag("render", function(nunjucksEngine) {
    return new RenderExtension(nunjucksEngine);
});
```
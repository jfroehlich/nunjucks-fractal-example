/* eslint-env node */
"use strict";
const fs = require("fs");
const path = require("path");

/**
 * Get nunjucks and fractal
 */
const fractal = module.exports = require("@frctl/fractal").create();
const nunjucks = require("@frctl/nunjucks")({
	env: {
		trimBlocks: true,
		lstripBlocks: true
	},
	paths: ["assets/"]
});

/**
 * Basic setup
 */
fractal.set("project.title", "Nunjucks / Fractal Integration Demo");
fractal.components.set("path", path.join(__dirname, "assets"));
fractal.web.set("static.path", path.join(__dirname, "public"));

/*
 * Set nunjuks as template engine for components.
 */
fractal.components.engine(nunjucks);
fractal.components.set("ext", ".html");
fractal.components.set("exclude", ["**/*~"]);

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

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


/**
 * A custom command to write a json file with all components and context
 * to the current working directory.
 */
fractal.cli.command("components-file", function (args, done) {
	const app = this.fractal;
	const sourcemap = {};

	for (let item of app.components.flatten()) {
		sourcemap["@" + item.handle] = {path: item.relViewPath, ctx: item.context};
		for (let variant of item.variants()) {
			sourcemap["@" + variant.handle] = {path: variant.relViewPath, ctx: variant.context};
		}
	}

	try {
		fs.writeFileSync(`${process.cwd()}/components.json`, JSON.stringify(sourcemap))
	} catch (err) {
		this.log.error(err);
	}

	done();
}, {description: "Create a json file with all json components in the working directory."});

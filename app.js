'use strict';

const path = require('path');
const fs = require('mz/fs');
const handlebars = require('handlebars');

const COMPILE = Symbol('compile');

module.exports = app => {
  const defaultLayout = app.config.handlebars.defaultLayout;
  const layoutsPath = app.config.handlebars.layoutsPath;
  const isExistLayoutsPath = await fs.exists(layoutsPath);
  const partials = loadPartial(app);
  if (partials) {
    for (const key of Object.keys(partials)) {
      handlebars.registerPartial(key, partials[key]);
    }
  }
  class HandlebarsView {
    constructor(ctx) {
      this.app = ctx.app;
    }

    async render(name, context, options) {
      const viewContent = await fs.readFile(name, 'utf8');
      const body = await this[COMPILE](viewContent, context, options);
      let layout = context.layout;
      if (layout === false || !defaultLayout) return body;
      layout = layout ? layout : defaultLayout;
      if (isExistLayoutsPath) {
         const layoutContent = await fs.readFile(path.join(layoutsPath,`${layout}.hbs`), 'utf-8');
         return this[COMPILE](layoutContent, Object.assign({}, context, { body }), options);
       }else{
         return body;
       }
    }

    async renderString(tpl, context, options) {
      return this[COMPILE](tpl, context, options);
    }

    [COMPILE](tpl, context, options) {
      return handlebars.compile(tpl, Object.assign({}, this.app.config.handlebars, options))(context);
    }
  }
  app.view.use('handlebars', HandlebarsView);
};

function loadPartial(app) {
  const partialsPath = app.config.handlebars.partialsPath;
  // istanbul ignore next
  if (!fs.existsSync(partialsPath)) return;

  const partials = {};
  const files = fs.readdirSync(partialsPath);
  for (let name of files) {
    const file = path.join(partialsPath, name);
    const stat = fs.statSync(file);
    if (!stat.isFile()) continue;

    name = name
      .replace(/\.\w+$/, '')
      .replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
    partials[name] = fs.readFileSync(file).toString();
  }
  return partials;
}

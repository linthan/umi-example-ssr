require("regenerator-runtime/runtime");
const Koa = require('koa');
const detect = require('detect-port');
const { join } = require('path');
const serve = require('koa-static-router');
const { renderToNodeStream } = require('react-dom/server');
const isDev = process.env.NODE_ENV === 'development';

const app = new Koa();
app.use(serve({
  dir: './dist',
  router: '/dist/',
}));
app.use(async (ctx, next) => {
  // 符合要求的路由才进行服务端渲染，否则走静态文件逻辑
  if (ctx.request.path === '/' || ctx.request.path === '/users' || ctx.request.path === '/count') {
    ctx.type = 'text/html';
    ctx.status = 200;
    // memo leak
    global.window = {};
    global.self = global.window;
    if (isDev) {
      delete require.cache[require.resolve('./dist/umi.server')];
    }
    const serverRender = require('./dist/umi.server');
    const { ReactDOMServer } = serverRender;

    const { htmlElement } = await serverRender.default({
      req: {
        url: ctx.request.url,
      }
    });
    ctx.res.write('<!DOCTYPE html>');
    const stream = ReactDOMServer.renderToNodeStream(htmlElement);
    global.window = {};
    global.self = global.window;
    ctx.body = stream;
  } else {
    await next();
  }
});

const port = 7001;

detect(port)
  .then(_port => {
    if (port == _port) {
      app.listen(_port + 1, () => {
        console.log(`server listening on ${_port + 1}`);
      });
    } else {
      app.listen(_port, () => {
        console.log(`server listening on ${_port}`);
      });
    }
  })
  .catch(err => {
    console.log(err);
  });



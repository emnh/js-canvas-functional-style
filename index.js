const $ = require('jquery');
const seedrandom = require('seedrandom');

const createConfig = () => {
  return {
    width: 600,
    height: 600,
  };
};

const compose = (cfg, f, g) => g(cfg, f(cfg));

const flist = (cfg, x) => x.map((f) => f(cfg));

const composeList = (cfg, f, gs) => gs.map((g) => compose(cfg, f, g));

const once = (cfg, f) =>
  (() => {
    if (f.result === undefined) {
      f.result = f(cfg);
    }
    return f.result;
  })();

const seed = (cfg) => seedrandom('hello.', { global: true });

const createCanvas = (cfg) => document.createElement('canvas');

const createCanvasOnce = (cfg) => compose(cfg, () => createCanvas, once);

const addCanvas = (cfg, canvas) => document.body.appendChild(canvas);

const setWidth = (cfg, canvas) => (canvas.width = cfg.width);

const setHeight = (cfg, canvas) => (canvas.height = cfg.height);

const setColor = (cfg, canvas) => (canvas.style = 'background: red;');

const canvasOps = [addCanvas, setWidth, setHeight, setColor];

const sizedCanvas = (cfg) => composeList(cfg, createCanvasOnce, canvasOps);

const main = composeList(createConfig(), (cfg) => null, [seed, sizedCanvas]);

$(main);

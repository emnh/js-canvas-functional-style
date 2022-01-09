const $ = require('jquery');
const seedrandom = require('seedrandom');
const { fromJS } = require('immutable');
const { Observable } = require('rxjs');

// Resources
// https://github.com/immutable-js/immutable-js/
// https://ramdajs.com/docs/
// https://rxjs.dev/guide/observable

// Features wanted:
// Trace logging of function calls and arguments (done)
// Composition (done)
// Readable code (todo)
// Versioned code (todo)
// Immutability (todo)
// Time travel (todo)
// Spreadsheet over code (todo)
// localStorage persistence (todo)
// Web worker support (todo)
// Offscreen canvas support (todo)
// NPM package (todo)

const createConfig = () => {
  return {
    stack: [],
    width: 600,
    height: 600,
  };
};

let state = fromJS({
  functions: {},
  config: {},
  data: {},
  version: 0,
});

const reg = (state, fundict) => {
  return (
    state
      .mergeDeep({ functions: fundict })
      // .setIn(['functions', name], body)
      .updateIn(['version'], (x) => x + 1)
  );
};

const resolve = (state, name) => state.getIn(['functions', name]);
// return new Promise((resolve, reject) => {
//   resolve(state.getIn(['functions', name]));
// });

state = reg(state, { identity: (state, x) => x });
state = reg(state, {
  trace: (state, f) => {
    console.log(f.name);
    return f();
  },
});
state = reg(state, {
  trace: (state, f, ...args) => {
    console.log(f.name, ...args);
    return f(state, ...args);
  },
  compose: (state, f, g) =>
    resolve(state, 'trace')(state, g, resolve(state, 'trace')(state, f)),
});
state = reg(state, {
  add: (state, a, b) => a + b,
  inc: (state, a) => a + 1,
  // });
  // state = reg(state, {
  addInc: (state, a, b) =>
    resolve(state, 'compose')(
      state,
      (state) => resolve(state, 'trace')(state, resolve(state, 'add'), a, b),
      resolve(state, 'inc')
    ),
});
console.log(state.toJS());
console.log('NUMBER', resolve(state, 'addInc')(state, 2, 3));

// const trace = (cfg, f, ...args) => {
//   console.log(cfg.stack.join('/'), f.name, ...args);
//   return f(
//     Object.assign({}, cfg, { stack: cfg.stack.concat(f.name) }),
//     ...args
//   );
// };
// const compose = (cfg, f, g, ...args) =>
//   trace(cfg, g, trace(cfg, f, ...args), ...args);

// const identity = (x) => x;

// const once = (cfg, f, ...args) =>
//   (() => {
//     if (f.result === undefined) {
//       f.result = f(cfg, ...args);
//     }
//     return f.result;
//   })();

// const composeList = (cfg, f, gs, ...args) => {
//   gs.map((g) =>
//     compose(cfg, (cfg) => trace(cfg, once, f, ...args), g, ...args)
//   );
// };

// const seed = (cfg) => seedrandom('hello.', { global: true });

// const createCanvas = (cfg) => document.createElement('canvas');

// const addCanvas = (cfg, canvas) => document.body.appendChild(canvas);

// const setWidth = (cfg, canvas) => (canvas.width = cfg.width);

// const setHeight = (cfg, canvas) => (canvas.height = cfg.height);

// const setColor = (cfg, canvas) => (canvas.style = 'background: red;');

// const canvasOps = [addCanvas, setWidth, setHeight, setColor];

// const sizedCanvas = (cfg) => composeList(cfg, createCanvas, canvasOps);

// const main = composeList(createConfig(), identity, [seed, sizedCanvas]);

// $(main);

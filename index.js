const $ = require('jquery');
const seedrandom = require('seedrandom');
const { fromJS } = require('immutable');
const { Observable, Subject } = require('rxjs');
const R = require('ramda');

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

// const createConfig = () => {
//   return {
//     stack: [],
//     width: 600,
//     height: 600,
//   };
// };

// const stateObservable = new Observable((subscriber) => {
//   subscriber.next(1);
//   subscriber.next(2);
//   subscriber.next(3);
//   setTimeout(() => {
//     subscriber.next(4);
//     subscriber.complete();
//   }, 1000);
// });
function isFunction(functionToCheck) {
  return (
    functionToCheck && {}.toString.call(functionToCheck) === '[object Function]'
  );
}

const Program = function () {
  const program = this;
  const stateSubject = new Subject();
  const traceSubject = new Subject();

  this.history = [];

  this.state = fromJS({
    functions: {},
    config: {},
    data: {},
    version: 0,
  });
  this.history.push(this.state);

  const namedWrap = R.curry((g, f) =>
    Object.defineProperty(g(f), 'name', {
      value: f.name,
      writable: false,
    })
  );

  const namedCurry = namedWrap(R.curry);

  stateSubject.subscribe({
    next(fundict) {
      program.state = program.state
        .mergeDeep({ functions: R.map(namedCurry, fundict) })
        .updateIn(['version'], (x) => x + 1);
      program.history.push(program.state);
      console.log('state updated:', program.state.toJS());
    },
    error(err) {
      console.error('something wrong occurred: ' + err);
    },
    complete() {
      console.log('done');
    },
  });

  const reg = (fundict) => {
    stateSubject.next(fundict);
  };

  const resolve = (name) => {
    const ret = this.state.getIn(['functions', name]);
    if (!isFunction(ret)) {
      throw 'No such function: ' + name;
    }
    return ret;
  };
  reg({
    identity: (x) => x,
    trace: (f, ...args) => {
      traceSubject.next({
        f,
        args: R.map((f) => (isFunction(f) ? f.name : f), args),
      });
      // }
      return f(...args);
    },
    compose: (f, g) =>
      Object.defineProperty((...args) => g(f(...args)), 'name', {
        value: 'compose',
        writable: false,
      }),
  });

  this.reg = reg;
  this.stateSubject = stateSubject;
  this.traceSubject = traceSubject;

  const handler = {
    get: function (target, prop, receiver) {
      if (target.hasOwnProperty(prop)) {
        return target[prop];
      }
      const resolved = resolve(prop);
      if (resolved !== undefined) {
        if (!isFunction(resolved)) {
          throw 'Not a function: ' + prop;
        }
        return namedCurry(
          Object.defineProperty(
            (...args) => resolve('trace')(resolve(prop), ...args),
            'name',
            {
              value: prop,
              writable: false,
            }
          )
        );
      }
      throw 'No such property: ' + prop + ': ' + receiver;
    },
  };

  const proxy = new Proxy(this, handler);

  return proxy;
};

const p = new Program();

p.reg({
  add: (a, b) => a + b,
  inc: (a) => a + 1,
  addInc: (...args) => p.compose(p.add, p.inc)(...args),
});
p.traceSubject.subscribe({
  next({ f, args }) {
    console.log('TRACE', f.name || f, ...args);
  },
});
console.log('NUMBER', p.addInc(2, 3));
// console.log('NUMBER', resolve('call')('addInc', 2, 3));

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

const $ = require('jquery');
const seedrandom = require('seedrandom');
const { fromJS } = require('immutable');
const { Observable, Subject } = require('rxjs');
const R = require('ramda');
// const hljs = require('highlight.js');
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

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
  const stateChangeSubject = new Subject();
  const stateSubject = new Subject();
  const traceSubject = new Subject();
  const configSubject = new Subject();

  this.history = [];

  this.state = fromJS({
    functions: {},
    config: {},
    data: {},
    version: 0,
  });
  this.history.push(this.state);

  const namedWrap = R.curry((g, f) =>
    Object.defineProperty(
      Object.defineProperty(g(f), 'name', {
        value: f.name,
        writable: false,
      }),
      'body',
      {
        value: f.toString(),
        writable: false,
      }
    )
  );

  const namedCurry = namedWrap(R.curry);

  stateChangeSubject.subscribe({
    next(fundict) {
      program.state = program.state
        .mergeDeep({ functions: R.map(namedCurry, fundict) })
        .updateIn(['version'], (x) => x + 1);
      program.history.push(program.state);
      stateSubject.next(program.state);
    },
    error(err) {
      console.error('something wrong occurred: ' + err);
    },
    complete() {
      console.log('done');
    },
  });

  const reg = (fundict) => {
    stateChangeSubject.next(fundict);
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
      const ret = f(...args);
      traceSubject.next({
        f,
        args: R.map((f) => (isFunction(f) ? f.name : f), args),
        ret,
      });
      return ret;
    },
    compose: (f, g) =>
      Object.defineProperty((...args) => g(f(...args)), 'name', {
        value: 'compose',
        writable: false,
      }),
    configure: (obj) => {
      configSubject.next(obj);
      return obj;
    },
    withConfig: (name, fn) => {
      configSubject.subscribe({
        next(value) {
          if (name in value) {
            fn(program.state.config);
          }
        },
      });
    },
  });

  this.reg = reg;
  this.stateSubject = stateSubject;
  this.stateChangeSubject = stateChangeSubject;
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

const main = function () {
  const container = $('body');
  let traceContainer = container;
  let output = container;
  const p = new Program();

  p.stateSubject.subscribe({
    next(state) {
      console.log('state updated:', state.toJS());
    },
  });
  p.stateChangeSubject.subscribe({
    next(fundict) {
      const s = Object.keys(fundict)
        .map(
          (f) =>
            hljs.highlight(
              'function ' + fundict[f].name + ': ' + fundict[f].toString(),
              {
                language: 'javascript',
              }
            ).value,
          fundict
        )
        .join('<br />');

      // console.log(s);
      const stateChange = $(
        '<div style="float: left; min-width: 30%; padding: 1em; border: 1px solid black; background: lightblue;"><div style="font-size: 20pt; padding-bottom: 10pt; margin-bottom: 10pt; text-decoration: underline; text-underline-offset: 5pt;">State change:</div><div class="stateChange">' +
          s +
          '</div></div>'
      );
      traceContainer = $('<div class="trace"></div>');
      const traceDiv = $(
        '<div style="float: left; min-width: 30%; padding: 1em; border: 1px solid black; background: pink;" ><div style="font-size: 20pt; padding-bottom: 10pt; margin-bottom: 10pt; text-decoration: underline; text-underline-offset: 5pt;">Trace</div></div>'
      );
      output = $('<div class="output"></div>');
      const outDiv = $(
        '<div style="float: left; min-width: 30%; padding: 1em; border: 1px solid black; background: lightgreen;" ><div style="font-size: 20pt; padding-bottom: 10pt; margin-bottom: 10pt; text-decoration: underline; text-underline-offset: 5pt;">Output</div></div>'
      );
      const line = $(
        "<div id='line' style='float: left; margin-bottom: 1em;'></div>"
      );
      container.append(line);
      traceDiv.append(traceContainer);
      outDiv.append(output);
      line.append(stateChange);
      line.append(traceDiv);
      line.append(outDiv);
    },
  });
  p.traceSubject.subscribe({
    next({ f, args, ret }) {
      traceContainer.append(
        '<div>' +
          (f.name || f) +
          '(' +
          args.join(', ') +
          ') → ' +
          ret +
          '</div>'
      );
      console.log('TRACE', f.name || f, ...args, ret);
    },
  });
  p.reg({
    add: (a, b) => a + b,
    inc: (a) => a + 1,
    addInc: (...args) => p.compose(p.add, p.inc)(...args),
  });
  console.log('NUMBER', p.addInc(2, 3));
  p.reg({
    createConfig: () => {
      c: 4;
    },
    add: (a, b) => p.withConfig('c', (config) => a + b + config.c),
    inc: (a) => a + 1,
    addInc: (...args) => p.compose(p.add, p.inc)(...args),
  });
  console.log('NUMBER', p.addInc(2, 3));
  p.reg({ inc: (a) => a + 2 });
  console.log('NUMBER', p.addInc(2, 3));
  p.reg({ faculty: (n) => (n > 1 ? n * p.faculty(n - 1) : 1) });
  console.log('NUMBER', p.faculty(5));

  p.reg({
    createConfig: () => {
      return p.configure({ width: 100, height: 100 });
    },
    seed: () => seedrandom('hello.', { global: true }),
    createCanvas: () => document.createElement('canvas'),
    addCanvas: (canvas) => output.append(canvas),
    setWidth: (canvas) =>
      p.withConfig('width', (config) => (canvas.width = config.width)),
    setHeight: (canvas) =>
      p.withConfig('height', (config) => (canvas.height = config.height)),
    setColor: (canvas) => (canvas.style = 'background: red;'),
    canvasOps: () => [p.addCanvas, p.setWidth, p.setHeight, p.setColor],
    // TODO: remove args or extend to memoize
    once: (f, ...args) =>
      (() => {
        if (f.result === undefined) {
          f.result = f(...args);
        }
        return f.result;
      })(),
    composeList: (f, gs, ...args) => {
      return gs.map((g) => p.compose(() => p.once(f, ...args), g, ...args));
    },
    sizedCanvas: () => p.composeList(p.createCanvas, p.canvasOps()),
    main: () =>
      p.composeList(p.createConfig, [p.seed, p.sizedCanvas]).map((f) => f()),
  });
  console.log('MAIN', p.main());
};
$(main);

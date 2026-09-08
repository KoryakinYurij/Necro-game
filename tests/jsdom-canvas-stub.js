const noop = () => {};

function makeCtx() {
  return new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createRadialGradient' || key === 'createLinearGradient' || key === 'createPattern')
        return () => ({ addColorStop: noop });
      if (key === 'measureText') return () => ({ width: 10 });
      if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return noop;
    },
    set(target, key, value) { target[key] = value; return true; }
  });
}

module.exports = function stubCanvas(window) {
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (!this.__ctx) this.__ctx = makeCtx();
    return this.__ctx;
  };
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop }));
};

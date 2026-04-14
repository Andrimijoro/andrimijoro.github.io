const SVG_NS = "http://www.w3.org/2000/svg";

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePoisson(lambda, random) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;

  do {
    count += 1;
    product *= random();
  } while (product > limit);

  return count - 1;
}

function cubicBSplineBasis(x) {
  const u = Math.abs(x);

  if (u < 1) {
    return (4 - 6 * u * u + 3 * u * u * u) / 6;
  }

  if (u < 2) {
    return Math.pow(2 - u, 3) / 6;
  }

  return 0;
}

function splineBasisMixture(x, basis) {
  return basis.reduce(
    (sum, component) => sum + component.weight * cubicBSplineBasis((x - component.center) / component.scale),
    0
  );
}

function makePath(width, baseline, basis, scale) {
  const steps = 180;
  const points = [];

  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * width;
    const t = x / width;
    const density = splineBasisMixture(t, basis);
    const y = baseline - density * scale;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return points.join(" ");
}

function appendSvgElement(parent, tag, attributes, textContent) {
  const element = document.createElementNS(SVG_NS, tag);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });

  if (textContent) {
    element.textContent = textContent;
  }

  parent.appendChild(element);
  return element;
}

function addDensityCurves(svg, width, height) {
  const curveConfigs = [
    {
      baseline: height * 0.18,
      scale: height * 0.1,
      className: "curve-teal",
      basis: [
        { weight: 0.85, center: 0.15, scale: 0.06 },
        { weight: 1.05, center: 0.38, scale: 0.07 },
        { weight: 0.8, center: 0.68, scale: 0.065 }
      ]
    },
    {
      baseline: height * 0.44,
      scale: height * 0.11,
      className: "curve-red",
      basis: [
        { weight: 0.7, center: 0.18, scale: 0.055 },
        { weight: 1.15, center: 0.49, scale: 0.075 },
        { weight: 0.76, center: 0.8, scale: 0.05 }
      ]
    },
    {
      baseline: height * 0.71,
      scale: height * 0.1,
      className: "curve-blue",
      basis: [
        { weight: 0.58, center: 0.12, scale: 0.045 },
        { weight: 0.82, center: 0.33, scale: 0.055 },
        { weight: 0.86, center: 0.57, scale: 0.055 },
        { weight: 0.6, center: 0.82, scale: 0.045 }
      ]
    },
    {
      baseline: height * 0.9,
      scale: height * 0.08,
      className: "curve-black",
      basis: [
        { weight: 0.74, center: 0.28, scale: 0.085 },
        { weight: 0.92, center: 0.68, scale: 0.095 }
      ]
    }
  ];

  curveConfigs.forEach((config) => {
    appendSvgElement(svg, "path", {
      d: makePath(width, config.baseline, config.basis, config.scale),
      class: config.className,
      fill: "none",
      "stroke-width": 1.6
    });
  });
}

function addPoissonPoints(svg, width, height, random) {
  const windows = [
    {
      x: width * 0.05,
      y: height * 0.05,
      w: width * 0.9,
      h: height * 0.22,
      lambda: 28,
      className: "point-teal"
    },
    {
      x: width * 0.08,
      y: height * 0.32,
      w: width * 0.86,
      h: height * 0.2,
      lambda: 32,
      className: "point-red"
    },
    {
      x: width * 0.06,
      y: height * 0.58,
      w: width * 0.88,
      h: height * 0.23,
      lambda: 36,
      className: "point-blue"
    },
    {
      x: width * 0.12,
      y: height * 0.82,
      w: width * 0.78,
      h: height * 0.12,
      lambda: 18,
      className: "point-neutral"
    }
  ];

  windows.forEach((windowConfig) => {
    const count = samplePoisson(windowConfig.lambda, random);

    for (let i = 0; i < count; i += 1) {
      const x = windowConfig.x + random() * windowConfig.w;
      const y = windowConfig.y + random() * windowConfig.h;
      const radius = 1.2 + random() * 1.8;

      appendSvgElement(svg, "circle", {
        cx: x.toFixed(2),
        cy: y.toFixed(2),
        r: radius.toFixed(2),
        class: windowConfig.className
      });
    }
  });
}

function addEquationLayer(width, height) {
  const existing = document.querySelector(".math-equations");

  if (existing) {
    existing.remove();
  }

  const layer = document.createElement("div");
  layer.className = "math-equations is-pending";
  layer.style.height = `${height}px`;

  const pageShell = document.querySelector(".page-shell");
  const shellWidth = pageShell ? pageShell.getBoundingClientRect().width : 860;
  const gutter = Math.max((width - shellWidth) / 2, 0);
  const leftWidth = gutter - 28;

  if (leftWidth < 150) {
    return;
  }

  const rightX = width - gutter + 18;

  const equations = [
    {
      left: 28,
      top: height * 0.08,
      width: leftWidth,
      strong: true,
      text: "\\[ f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\exp\\!\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right) \\]"
    },
    {
      left: rightX,
      top: height * 0.16,
      width: leftWidth,
      text: "\\[ \\hat f_h(x)=\\frac{1}{nh}\\sum_{i=1}^n K\\!\\left(\\frac{x-X_i}{h}\\right) \\]"
    },
    {
      left: 34,
      top: height * 0.33,
      width: leftWidth,
      strong: true,
      text: "\\[ \\mathbb{P}\\{N(A)=k\\}=\\frac{\\Lambda(A)^k}{k!}e^{-\\Lambda(A)} \\]"
    },
    {
      left: rightX,
      top: height * 0.41,
      width: leftWidth,
      text: "\\[ \\lambda(s)=\\lim_{|ds|\\to 0}\\frac{\\mathbb{E}[N(ds)]}{|ds|} \\]"
    },
    {
      left: 28,
      top: height * 0.58,
      width: leftWidth,
      text: "\\[ \\ell(\\theta)=\\sum_{i=1}^n\\log\\lambda(x_i;\\theta)-\\int_W \\lambda(u;\\theta)\\,du \\]"
    },
    {
      left: rightX,
      top: height * 0.67,
      width: leftWidth,
      strong: true,
      text: "\\[ f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\exp\\!\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right) \\]"
    },
    {
      left: 34,
      top: height * 0.84,
      width: leftWidth,
      text: "\\[ p(\\theta\\mid x)=\\frac{p(x\\mid\\theta)p(\\theta)}{p(x)} \\]"
    },
    {
      left: rightX,
      top: height * 0.9,
      width: leftWidth,
      text: "\\[ K(r)=\\lambda^{-1}\\,\\mathbb{E}[N\\{B(0,r)\\}\\mid 0\\in X] \\]"
    }
  ];

  equations.forEach((equation) => {
    const node = document.createElement("div");
    node.className = `math-equation${equation.strong ? " math-equation--strong" : ""}`;
    node.style.left = `${equation.left}px`;
    node.style.top = `${equation.top}px`;
    node.style.width = `${equation.width}px`;
    node.innerHTML = equation.text;
    layer.appendChild(node);
  });

  document.body.prepend(layer);
  typesetEquationLayer(layer);
}

function typesetEquationLayer(layer, attempts = 0) {
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetClear?.([layer]);
    window.MathJax
      .typesetPromise([layer])
      .then(() => {
        layer.classList.remove("is-pending");
      })
      .catch(() => {});
    return;
  }

  if (attempts < 20) {
    window.setTimeout(() => typesetEquationLayer(layer, attempts + 1), 150);
  }
}

function renderMathBackground() {
  const existing = document.querySelector(".math-background");

  if (existing) {
    existing.remove();
  }

  const layer = document.createElement("div");
  layer.className = "math-background";

  const width = Math.max(document.documentElement.clientWidth, 1440);
  const height = Math.max(document.body.scrollHeight, window.innerHeight, 1400);
  layer.style.height = `${height}px`;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const defs = appendSvgElement(svg, "defs", {});
  const pageShell = document.querySelector(".page-shell");
  const shellWidth = pageShell ? pageShell.getBoundingClientRect().width : 860;
  const gutter = Math.max((width - shellWidth) / 2, 0);
  const inset = 18;
  const clipWidth = Math.max(gutter - inset, 0);

  if (clipWidth <= 0) {
    layer.appendChild(svg);
    document.body.prepend(layer);
    addEquationLayer(width, height);
    return;
  }

  const leftClip = appendSvgElement(defs, "clipPath", { id: "math-clip-left" });
  appendSvgElement(leftClip, "rect", {
    x: 0,
    y: 0,
    width: clipWidth,
    height
  });

  const rightClip = appendSvgElement(defs, "clipPath", { id: "math-clip-right" });
  appendSvgElement(rightClip, "rect", {
    x: width - clipWidth,
    y: 0,
    width: clipWidth,
    height
  });

  const leftGroup = appendSvgElement(svg, "g", { "clip-path": "url(#math-clip-left)" });
  const rightGroup = appendSvgElement(svg, "g", { "clip-path": "url(#math-clip-right)" });

  const random = createSeededRandom(20260414);

  addDensityCurves(leftGroup, width, height);
  addDensityCurves(rightGroup, width, height);
  addPoissonPoints(leftGroup, width, height, random);
  addPoissonPoints(rightGroup, width, height, random);

  layer.appendChild(svg);
  document.body.prepend(layer);
  addEquationLayer(width, height);
}

function setupMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Close" : "Menu";
  });
}

let resizeTimer = null;

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(renderMathBackground, 120);
});

window.addEventListener("load", renderMathBackground);

renderMathBackground();
setupMobileNav();

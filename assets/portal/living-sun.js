(() => {
  const scene = document.querySelector('.sun-scene');
  if (!scene) return;
  const hero = scene.closest('.section-hero');
  const stage = hero.querySelector('.container-hero');
  const image = scene.querySelector('img');
  const canvas = scene.querySelector('canvas');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  hero.setAttribute('data-sun-hero', '');

  let frame = 0;
  let visible = false;
  let renderer = null;
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let previousTime = 0;

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function smooth(value) {
    const p = clamp(value);
    return p * p * (3 - 2 * p);
  }

  function createRenderer() {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return null;

    const vertexSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    const fragmentSource = `
      precision mediump float;
      uniform sampler2D artwork;
      uniform vec2 resolution;
      uniform vec2 imageSize;
      uniform vec2 pointer;
      uniform float zoom;
      uniform float time;
      uniform float motionEnabled;

      void main() {
        vec2 point = gl_FragCoord.xy - resolution * vec2(0.5, 0.46);
        point -= pointer * motionEnabled;
        float angle = motionEnabled * (sin(time * 0.12) * 0.008);
        point = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * point;
        vec2 uv = point / (imageSize * zoom) + 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        vec2 radial = (uv - 0.5) * vec2(0.8, 1.0);
        float radius = length(radial);
        float solarSurface = 1.0 - smoothstep(0.34, 0.46, radius);
        float wave = sin(radial.y * 85.0 + time * 0.65)
                   * sin(radial.x * 61.0 - time * 0.43);
        vec2 flow = vec2(
          sin(radial.y * 49.0 + time * 0.3),
          cos(radial.x * 55.0 - time * 0.38)
        );
        uv += flow * wave * solarSurface * motionEnabled * 0.0024;
        vec3 color = texture2D(artwork, uv).rgb;
        float luminosity = max(color.r, max(color.g, color.b));
        float activity = 1.0 + sin(time * 0.65 + radius * 25.0) * 0.018
                              * solarSurface * motionEnabled;
        color *= mix(1.0, activity, smoothstep(0.12, 0.8, luminosity));
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    const locations = Object.fromEntries(
      ['resolution', 'imageSize', 'pointer', 'zoom', 'time', 'motionEnabled'].map(name => [name, gl.getUniformLocation(program, name)])
    );
    gl.uniform1i(gl.getUniformLocation(program, 'artwork'), 0);

    return (zoom, time) => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(scene.clientWidth * dpr));
      const height = Math.max(1, Math.round(scene.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      const imageHeight = height * 1.18;
      const imageWidth = imageHeight * image.naturalWidth / image.naturalHeight;
      gl.uniform2f(locations.resolution, width, height);
      gl.uniform2f(locations.imageSize, imageWidth, imageHeight);
      gl.uniform2f(locations.pointer, currentX * dpr, currentY * dpr);
      gl.uniform1f(locations.zoom, zoom);
      gl.uniform1f(locations.time, time);
      gl.uniform1f(locations.motionEnabled, motion.matches ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
  }

  function render(timestamp) {
    frame = 0;
    const distance = Math.max(1, hero.offsetHeight - stage.offsetHeight);
    const progress = clamp(-hero.getBoundingClientRect().top / distance);
    const zoom = motion.matches ? 1 : 1 + 11 * Math.pow(progress, 2.8);
    const white = smooth((progress - (motion.matches ? 0.5 : 0.71)) / (motion.matches ? 0.5 : 0.29));
    const copy = 1 - smooth((progress - 0.08) / 0.38);
    scene.style.setProperty('--sun-zoom', zoom.toFixed(4));
    scene.style.setProperty('--sun-white', white.toFixed(4));
    hero.style.setProperty('--sun-copy-opacity', copy.toFixed(4));

    const elapsed = Math.min(64, timestamp - previousTime || 16);
    previousTime = timestamp;
    const follow = 1 - Math.exp(-elapsed / 240);
    currentX += (pointerX - currentX) * follow;
    currentY += (pointerY - currentY) * follow;
    if (renderer) renderer(zoom, timestamp * 0.001);
    if (visible && !document.hidden && !motion.matches && renderer) frame = requestAnimationFrame(render);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function initialize() {
    try {
      renderer = createRenderer();
    } catch {
      renderer = null;
    }
    scene.toggleAttribute('data-sun-rendering', !!renderer);
    schedule();
  }

  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) schedule();
  }).observe(hero);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pointermove', event => {
    pointerX = (event.clientX / innerWidth - 0.5) * 20;
    pointerY = (0.5 - event.clientY / innerHeight) * 14;
    if (visible) schedule();
  }, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    renderer = null;
    scene.removeAttribute('data-sun-rendering');
    schedule();
  });
  canvas.addEventListener('webglcontextrestored', initialize);
  if (image.complete && image.naturalWidth) initialize();
  else image.addEventListener('load', initialize, { once: true });
})();

"use client";

import { useEffect, useRef } from "react";

type RGB = [number, number, number];

type Palette = {
  back: RGB;
  brand: RGB;
  soft: RGB;
  muted: RGB;
  isDark: number;
};

// Matches web/src/app/globals.css design tokens exactly (Teal & Slate, zero purple).
const LIGHT_PALETTE: Palette = {
  back: hexToRgb("#f8fafc"),
  brand: hexToRgb("#0f766e"),
  soft: hexToRgb("#99f6e4"),
  muted: hexToRgb("#cbd5e1"),
  isDark: 0,
};

const DARK_PALETTE: Palette = {
  back: hexToRgb("#0b1120"),
  brand: hexToRgb("#2dd4bf"),
  soft: hexToRgb("#134e4a"),
  muted: hexToRgb("#1e293b"),
  isDark: 1,
};

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(
    (v) => v / 255,
  ) as RGB;
}

const VERT_SRC = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_colorBack;
uniform vec3 u_colorBrand;
uniform vec3 u_colorSoft;
uniform vec3 u_colorMuted;
uniform float u_isDark;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  // Aspect-corrected space anchored to the top-right radar origin.
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 origin = vec2(aspect * 0.8875, 0.85);
  vec2 d = p - origin;
  float dist = length(d);
  float angle = atan(d.y, d.x);

  // Subtle NeuroNoise-modulated concentric radar waves.
  float n = noise(d * 3.2 + vec2(u_time * 0.14, -u_time * 0.11));
  float wave = 0.5 + 0.5 * sin(dist * 22.0 - u_time * 1.1 + n * 2.4);
  float ringMask = smoothstep(0.55, 0.98, wave) * exp(-dist * 1.35);

  // Soft clockwise radar sweep sector.
  float sweepAngle = mod(-u_time * 0.55, 6.2831853);
  float delta = mod(angle - sweepAngle + 6.2831853, 6.2831853);
  float sweep = exp(-delta * 2.6) * smoothstep(0.02, 0.14, dist) * exp(-dist * 1.15);

  // DotOrbit-inspired orbital telemetry nodes riding the radar rings.
  float dots = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float r = 0.15 + fi * 0.145;
    float a = u_time * (0.28 - fi * 0.045) + fi * 1.75;
    vec2 node = origin + vec2(cos(a), sin(a)) * r;
    float nd = length(p - node);
    dots += smoothstep(0.03, 0.0, nd) * 0.85;
  }

  // Fine dotted telemetry field.
  vec2 gridUv = fract(d * 14.0) - 0.5;
  float latticeDot = smoothstep(0.18, 0.06, length(gridUv)) * exp(-dist * 1.65) * (0.35 + 0.65 * n);

  float glowStrength = ringMask * 0.24 + sweep * 0.34 + latticeDot * 0.14;
  vec3 col = mix(u_colorBack, u_colorSoft, clamp(glowStrength, 0.0, 1.0));
  col = mix(col, u_colorBrand, clamp(sweep * 0.24 + dots * 0.45, 0.0, 1.0));
  col = mix(col, u_colorMuted, clamp(ringMask * 0.08, 0.0, 1.0));

  float alpha = clamp(
    glowStrength * (u_isDark > 0.5 ? 0.56 : 0.42) +
      dots * (u_isDark > 0.5 ? 0.46 : 0.28),
    0.0,
    u_isDark > 0.5 ? 0.42 : 0.30
  );

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export type RadarShaderProps = {
  /** Animation speed multiplier; automatically forced to 0 under prefers-reduced-motion or offscreen. */
  speed?: number;
  className?: string;
};

/**
 * Zero-dependency WebGL fragment shader backdrop for PingKhana's Live Intelligence Radar header.
 * Reacts to Light/Dark color schemes, respects prefers-reduced-motion (speed=0), and pauses offscreen.
 */
export function RadarShader({ speed = 0.3, className = "" }: RadarShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) {
      if (vert) gl.deleteShader(vert);
      if (frag) gl.deleteShader(frag);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      return;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "a_pos");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uColorBack = gl.getUniformLocation(program, "u_colorBack");
    const uColorBrand = gl.getUniformLocation(program, "u_colorBrand");
    const uColorSoft = gl.getUniformLocation(program, "u_colorSoft");
    const uColorMuted = gl.getUniformLocation(program, "u_colorMuted");
    const uIsDark = gl.getUniformLocation(program, "u_isDark");

    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let isDark = darkQuery.matches;
    let reducedMotion = motionQuery.matches;
    let isVisible = true;
    let pageVisible = document.visibilityState !== "hidden";

    // Start at t=1.2s so static reduced-motion frames show well-distributed orbital nodes.
    let simTime = 1.2;
    let lastNow = performance.now();
    let rafId = 0;

    function effectiveSpeed(): number {
      return reducedMotion || !isVisible || !pageVisible ? 0 : speedRef.current;
    }

    function syncSize() {
      if (!container || !canvas || !gl) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function drawFrame() {
      if (!gl || !canvas) return;
      const p = isDark ? DARK_PALETTE : LIGHT_PALETTE;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, simTime);
      gl.uniform3fv(uColorBack, p.back);
      gl.uniform3fv(uColorBrand, p.brand);
      gl.uniform3fv(uColorSoft, p.soft);
      gl.uniform3fv(uColorMuted, p.muted);
      gl.uniform1f(uIsDark, p.isDark);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function tick(now: number) {
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      const spd = effectiveSpeed();
      if (spd === 0) {
        rafId = 0;
        return;
      }
      simTime += dt * (spd / 0.3);
      drawFrame();
      rafId = window.requestAnimationFrame(tick);
    }

    function updatePlayback(redrawStatic = false) {
      const spd = effectiveSpeed();
      if (spd === 0) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        if (redrawStatic) drawFrame();
        return;
      }
      if (!rafId) {
        lastNow = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    }

    syncSize();
    drawFrame();
    updatePlayback();

    const resizeObs = new ResizeObserver(() => {
      syncSize();
      drawFrame();
    });
    resizeObs.observe(container);

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        updatePlayback();
      },
      { threshold: 0.01 },
    );
    io.observe(container);

    const onDarkChange = (e: MediaQueryListEvent) => {
      isDark = e.matches;
      drawFrame();
    };
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      updatePlayback(true);
    };
    const onVisibilityChange = () => {
      pageVisible = document.visibilityState !== "hidden";
      updatePlayback();
    };
    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    darkQuery.addEventListener("change", onDarkChange);
    motionQuery.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      io.disconnect();
      darkQuery.removeEventListener("change", onDarkChange);
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gl.deleteBuffer(buf);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`radar-mask-tr pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}

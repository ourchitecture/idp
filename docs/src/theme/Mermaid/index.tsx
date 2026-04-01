import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ErrorBoundary from "@docusaurus/ErrorBoundary";
import { ErrorBoundaryErrorMessageFallback } from "@docusaurus/theme-common";
import {
  MermaidContainerClassName,
  useMermaidConfig,
  useMermaidRenderResult,
} from "@docusaurus/theme-mermaid/client";
import type { MermaidConfig } from "mermaid";
import styles from "./styles.module.css";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.2;
const DRAG_START_THRESHOLD_PX = 6;

const C4_READABILITY_OVERRIDES: MermaidConfig["c4"] = {
  c4ShapeInRow: 2,
  c4BoundaryInRow: 1,
  diagramMarginX: 64,
  diagramMarginY: 24,
  c4ShapeMargin: 72,
  c4ShapePadding: 28,
  width: 320,
  height: 170,
  boxMargin: 18,
  wrap: true,
  wrapPadding: 24,
  personFontSize: 20,
  external_personFontSize: 20,
  systemFontSize: 20,
  external_systemFontSize: 20,
  system_dbFontSize: 18,
  external_system_dbFontSize: 18,
  system_queueFontSize: 18,
  external_system_queueFontSize: 18,
  containerFontSize: 18,
  external_containerFontSize: 18,
  container_dbFontSize: 18,
  external_container_dbFontSize: 18,
  container_queueFontSize: 18,
  external_container_queueFontSize: 18,
  componentFontSize: 17,
  external_componentFontSize: 17,
  component_dbFontSize: 17,
  external_component_dbFontSize: 17,
  component_queueFontSize: 17,
  external_component_queueFontSize: 17,
  boundaryFontSize: 20,
  messageFontSize: 16,
};

interface Transform {
  scale: number;
  x: number;
  y: number;
}

function ZoomableMermaid({
  renderResult,
}: {
  renderResult: { svg: string; bindFunctions?: (el: Element | null) => void };
}): ReactNode {
  const svgRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    x: 0,
    y: 0,
  });

  // Track dragging state in refs to avoid stale closures in pointer handlers
  const pointerDown = useRef(false);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const div = svgRef.current;
    renderResult.bindFunctions?.(div);
  }, [renderResult]);

  // --- Zoom helpers ---
  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomTo = useCallback(
    (newScale: number, cx?: number, cy?: number) => {
      setTransform((prev) => {
        const clamped = clampScale(newScale);
        if (cx !== undefined && cy !== undefined) {
          // Zoom towards the cursor position
          const ratio = clamped / prev.scale;
          return {
            scale: clamped,
            x: cx - (cx - prev.x) * ratio,
            y: cy - (cy - prev.y) * ratio,
          };
        }
        // Zoom towards the viewport centre
        const vp = viewportRef.current;
        if (vp) {
          const rect = vp.getBoundingClientRect();
          const centreX = rect.width / 2;
          const centreY = rect.height / 2;
          const ratio = clamped / prev.scale;
          return {
            scale: clamped,
            x: centreX - (centreX - prev.x) * ratio,
            y: centreY - (centreY - prev.y) * ratio,
          };
        }
        return { ...prev, scale: clamped };
      });
    },
    [],
  );

  const zoomIn = useCallback(() => {
    setTransform((prev) => {
      const newScale = clampScale(prev.scale * (1 + ZOOM_STEP));
      const vp = viewportRef.current;
      if (vp) {
        const rect = vp.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const ratio = newScale / prev.scale;
        return {
          scale: newScale,
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        };
      }
      return { ...prev, scale: newScale };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => {
      const newScale = clampScale(prev.scale / (1 + ZOOM_STEP));
      const vp = viewportRef.current;
      if (vp) {
        const rect = vp.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const ratio = newScale / prev.scale;
        return {
          scale: newScale,
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        };
      }
      return { ...prev, scale: newScale };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, []);

  // --- Wheel zoom ---
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = vp!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      setTransform((prev) => {
        const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 / (1 + ZOOM_STEP);
        const newScale = clampScale(prev.scale * factor);
        const ratio = newScale / prev.scale;
        return {
          scale: newScale,
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        };
      });
    }

    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  // --- Pointer drag (pan) ---
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle primary button (left click / single touch)
    if (e.button !== 0) return;
    pointerDown.current = true;
    dragging.current = false;
    didDrag.current = false;
    startPointer.current = { x: e.clientX, y: e.clientY };
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerDown.current) return;

    if (!dragging.current) {
      const distance = Math.hypot(
        e.clientX - startPointer.current.x,
        e.clientY - startPointer.current.y,
      );

      if (distance < DRAG_START_THRESHOLD_PX) return;

      dragging.current = true;
      didDrag.current = true;
    }

    e.preventDefault();

    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointerDown.current = false;
    if (didDrag.current) {
      e.preventDefault();
    }
    dragging.current = false;

    const viewport = e.currentTarget as HTMLElement;
    if (viewport.hasPointerCapture(e.pointerId)) {
      viewport.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!didDrag.current) return;
    e.preventDefault();
    e.stopPropagation();
    didDrag.current = false;
  }, []);

  const cssTransform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
  const scaleLabel = `${Math.round(transform.scale * 100)}%`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.btn}
          onClick={zoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={zoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          &#x2212;
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={resetZoom}
          title="Reset zoom"
          aria-label="Reset zoom"
        >
          {scaleLabel}
        </button>
      </div>

      <div
        ref={viewportRef}
        className={styles.viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div
          ref={svgRef}
          className={`${MermaidContainerClassName} ${styles.canvas}`}
          style={{ transform: cssTransform }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: renderResult.svg }}
        />
      </div>
    </div>
  );
}

function MermaidRenderer({ value }: { value: string }): ReactNode {
  const defaultMermaidConfig = useMermaidConfig();
  const mermaidConfig = useMemo<MermaidConfig>(
    () => ({
      ...defaultMermaidConfig,
      c4: {
        ...defaultMermaidConfig.c4,
        ...C4_READABILITY_OVERRIDES,
      },
    }),
    [defaultMermaidConfig],
  );
  const renderResult = useMermaidRenderResult({
    text: value,
    config: mermaidConfig,
  });
  if (renderResult === null) {
    return null;
  }
  return <ZoomableMermaid renderResult={renderResult} />;
}

export default function Mermaid(props: { value: string }): ReactNode {
  return (
    <ErrorBoundary
      fallback={(params) => <ErrorBoundaryErrorMessageFallback {...params} />}
    >
      <MermaidRenderer {...props} />
    </ErrorBoundary>
  );
}

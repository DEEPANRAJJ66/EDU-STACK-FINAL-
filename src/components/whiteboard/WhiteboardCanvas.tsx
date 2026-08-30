import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  WhiteboardElement,
  WhiteboardTool,
  Shape2DType,
  Shape3DType,
  MathToolType,
  PhysicsToolType,
  BoardTheme,
  FreehandStroke,
  Shape2DElement,
  Shape3DElement,
  MathElement,
  PhysicsElement,
  TextElement,
  ImageElement,
  Point,
} from './types';
import { draw2DShape } from './tools/2DShapes';
import { draw3DShape } from './tools/3DObjects';
import { drawMathObject } from './tools/MathTools';
import { drawPhysicsObject } from './tools/PhysicsTools';
import { drawThemeBackground, renderElement } from './utils/renderSlide';
import { eraseElementsInPath } from './utils/eraserUtils';
import { readFileAsDataURL, loadImageDimensions, fitDimensions } from './utils/imageUtils';
import { UploadCloud } from 'lucide-react';

interface WhiteboardCanvasProps {
  elements: WhiteboardElement[];
  backgroundImage?: string;
  theme: BoardTheme;
  currentTool: WhiteboardTool;
  selectedShape2D: Shape2DType;
  selectedShape3D: Shape3DType;
  selectedMathTool: MathToolType;
  selectedPhysicsTool: PhysicsToolType;
  color: string;
  strokeWidth: number;
  eraserSize?: number;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onAddElement: (element: WhiteboardElement) => void;
  onUpdateElement: (element: WhiteboardElement) => void;
  onSetElements?: (elements: WhiteboardElement[], saveHistory?: boolean) => void;
  onDeleteElements: (ids: string[]) => void;
  onDeleteSelected: () => void;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type HandleType = ResizeHandle | 'rotate';

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  elements,
  backgroundImage,
  theme,
  currentTool,
  selectedShape2D,
  selectedShape3D,
  selectedMathTool,
  selectedPhysicsTool,
  color,
  strokeWidth,
  eraserSize = 24,
  selectedElementId,
  onSelectElement,
  onAddElement,
  onUpdateElement,
  onSetElements,
  onDeleteElements,
  onDeleteSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);

  // Drag & drop file on canvas state
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  // Drawing & Erasing state
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [isErasing, setIsErasing] = useState(false);
  const isErasingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const currentStrokePoints = useRef<{ x: number; y: number; pressure?: number }[]>([]);
  const startPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previewShapeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Interaction Mode for Selection: NONE | DRAGGING | RESIZING | ROTATING
  const interactionModeRef = useRef<'NONE' | 'DRAGGING' | 'RESIZING' | 'ROTATING'>('NONE');
  const activeHandleRef = useRef<HandleType | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<HandleType | null>(null);

  const resizeInitialRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    aspectRatio: number;
    lockAspectRatio: boolean;
    center: { x: number; y: number };
  }>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    aspectRatio: 1,
    lockAspectRatio: false,
    center: { x: 0, y: 0 },
  });

  // Latest elements ref for real-time eraser and smooth direct drag/transform updates
  const elementsRef = useRef<WhiteboardElement[]>(elements);
  const hasMovedOrTransformedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isErasing && interactionModeRef.current === 'NONE') {
      elementsRef.current = elements;
    }
  }, [elements, isErasing]);

  // Eraser live cursor and drag tracking
  const eraserCursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastEraserPosRef = useRef<Point | null>(null);

  // Drag element offset
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Laser Pointer Trail
  const laserPointsRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const laserAnimRef = useRef<number | null>(null);

  // Background image cache
  const bgImageCacheRef = useRef<HTMLImageElement | null>(null);

  // Preload background image if any
  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      img.onload = () => {
        bgImageCacheRef.current = img;
        renderCanvas();
      };
    } else {
      bgImageCacheRef.current = null;
      renderCanvas();
    }
  }, [backgroundImage]);

  // Transform screen coordinate to canvas coordinate
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const screenX = (clientX - rect.left) * scaleX;
      const screenY = (clientY - rect.top) * scaleY;

      // Adjust for pan & zoom
      return {
        x: (screenX - pan.x) / zoom,
        y: (screenY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Main Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Pan & Zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw Theme Background Pattern
    drawThemeBackground(ctx, canvas.width / zoom, canvas.height / zoom, theme);

    // 2. Draw PDF / Image Slide Background if present
    if (bgImageCacheRef.current) {
      try {
        ctx.drawImage(bgImageCacheRef.current, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.warn('Failed to draw bg image', err);
      }
    }

    // 3. Render Elements in Layer Order
    const elementsToRender = elementsRef.current || elements;
    elementsToRender.forEach((element) => {
      renderElement(ctx, element, () => {
        // Redraw on async image load
        renderCanvas();
      });

      // If selected, draw selection bounding box, 8 resize handles, and top rotation handle
      if (element.id === selectedElementId) {
        drawSelectionBox(ctx, element);
      }
    });

    // 4. Render Active Live Preview Shape if currently drawing
    if (isDrawing && previewShapeRef.current) {
      const { x, y, w, h } = previewShapeRef.current;
      ctx.save();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    // 5. Render Active Freehand Stroke being drawn
    if (isDrawing && currentStrokePoints.current.length > 1) {
      const pts = currentStrokePoints.current;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = currentTool === 'HIGHLIGHTER' ? strokeWidth * 4 : strokeWidth;
      ctx.globalAlpha = currentTool === 'HIGHLIGHTER' ? 0.35 : 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const xc = (pts[i].x + pts[i - 1].x) / 2;
        const yc = (pts[i].y + pts[i - 1].y) / 2;
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 6. Render Laser Pointer Trail
    const now = Date.now();
    laserPointsRef.current = laserPointsRef.current.filter((pt) => now - pt.time < 900);
    if (laserPointsRef.current.length > 1) {
      const pts = laserPointsRef.current;
      ctx.save();
      for (let i = 1; i < pts.length; i++) {
        const age = now - pts[i].time;
        const opacity = Math.max(0, 1 - age / 900);
        ctx.strokeStyle = `rgba(244, 63, 94, ${opacity})`;
        ctx.lineWidth = Math.max(2, (1 - age / 900) * 12);
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      // Glowing head
      const head = pts[pts.length - 1];
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. Render Eraser Reticle Indicator on canvas when hovering or erasing
    if (currentTool === 'ERASER' && eraserCursorPosRef.current) {
      const { x, y } = eraserCursorPosRef.current;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, eraserSize, 0, Math.PI * 2);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.fillStyle = isErasing ? 'rgba(244, 63, 94, 0.2)' : 'rgba(244, 63, 94, 0.06)';
      ctx.fill();
      ctx.restore();
    }
  }, [
    elements,
    theme,
    pan,
    zoom,
    selectedElementId,
    isDrawing,
    isErasing,
    currentTool,
    selectedShape2D,
    selectedShape3D,
    selectedMathTool,
    selectedPhysicsTool,
    color,
    strokeWidth,
    eraserSize,
  ]);

  // Request Animation Frame for Laser trail
  useEffect(() => {
    const loop = () => {
      if (laserPointsRef.current.length > 0) {
        renderCanvas();
      }
      laserAnimRef.current = requestAnimationFrame(loop);
    };
    laserAnimRef.current = requestAnimationFrame(loop);
    return () => {
      if (laserAnimRef.current) cancelAnimationFrame(laserAnimRef.current);
    };
  }, [renderCanvas]);

  // Auto-resize high resolution canvas (1920x1080 native 16:9)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1920;
    canvas.height = 1080;
    renderCanvas();
  }, [renderCanvas]);

  // Finalize / Commit any ongoing action (Stroke, Shape, Erase, Drag, Resize, Rotate, Pan)
  const finalizeAction = useCallback(() => {
    if (canvasRef.current && activePointerIdRef.current !== null) {
      try {
        if (canvasRef.current.hasPointerCapture(activePointerIdRef.current)) {
          canvasRef.current.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {}
      activePointerIdRef.current = null;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
    }

    if (isErasingRef.current) {
      isErasingRef.current = false;
      setIsErasing(false);
      lastEraserPosRef.current = null;
      if (onSetElements) {
        onSetElements(elementsRef.current, false);
      }
    }

    if (interactionModeRef.current !== 'NONE') {
      if (hasMovedOrTransformedRef.current && selectedElementId) {
        const finalEl = elementsRef.current.find((x) => x.id === selectedElementId);
        if (finalEl) {
          onUpdateElement(finalEl);
        }
      }
      interactionModeRef.current = 'NONE';
      activeHandleRef.current = null;
      hasMovedOrTransformedRef.current = false;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      setIsDrawing(false);

      if (currentTool === 'PEN' || currentTool === 'PENCIL' || currentTool === 'HIGHLIGHTER') {
        const pts = currentStrokePoints.current;
        if (pts.length > 0) {
          const newStroke: FreehandStroke = {
            id: 'stroke_' + Date.now(),
            type: 'STROKE',
            tool: currentTool,
            points: pts,
            color,
            strokeWidth: currentTool === 'HIGHLIGHTER' ? strokeWidth * 4 : strokeWidth,
            opacity: currentTool === 'HIGHLIGHTER' ? 0.35 : 1,
          };
          onAddElement(newStroke);
        }
        currentStrokePoints.current = [];
      } else if (previewShapeRef.current) {
        const { x, y, w, h } = previewShapeRef.current;
        if (w > 5 && h > 5) {
          if (currentTool === 'SHAPE_2D') {
            const shapeEl: Shape2DElement = {
              id: 'shape2d_' + Date.now(),
              type: 'SHAPE_2D',
              shape: selectedShape2D,
              x,
              y,
              width: w,
              height: h,
              color,
              strokeWidth,
            };
            onAddElement(shapeEl);
          } else if (currentTool === 'SHAPE_3D') {
            const shape3dEl: Shape3DElement = {
              id: 'shape3d_' + Date.now(),
              type: 'SHAPE_3D',
              shape: selectedShape3D,
              x,
              y,
              width: w,
              height: h,
              rotX: -15,
              rotY: 25,
              rotZ: 0,
              color,
              strokeWidth,
              showHiddenEdges: true,
              showVertexLabels: false,
            };
            onAddElement(shape3dEl);
          } else if (currentTool === 'MATH_TOOL') {
            const mathEl: MathElement = {
              id: 'math_' + Date.now(),
              type: 'MATH_OBJECT',
              mathType: selectedMathTool,
              x,
              y,
              width: w,
              height: h,
              color,
              strokeWidth,
              data: {},
            };
            onAddElement(mathEl);
          } else if (currentTool === 'PHYSICS_TOOL') {
            const physicsEl: PhysicsElement = {
              id: 'physics_' + Date.now(),
              type: 'PHYSICS_OBJECT',
              physicsType: selectedPhysicsTool,
              x,
              y,
              width: w,
              height: h,
              color,
              strokeWidth,
              data: {},
            };
            onAddElement(physicsEl);
          }
        }
        previewShapeRef.current = null;
      }
    }

    renderCanvas();
  }, [
    currentTool,
    selectedShape2D,
    selectedShape3D,
    selectedMathTool,
    selectedPhysicsTool,
    color,
    strokeWidth,
    onAddElement,
    onSetElements,
    renderCanvas,
  ]);

  // Window pointerup safeguard
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDrawingRef.current || isErasingRef.current || isPanningRef.current || interactionModeRef.current !== 'NONE') {
        finalizeAction();
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [finalizeAction]);

  // Dynamic native cursor styling based on active tool & handle hover
  const getCanvasCursorClass = useCallback(() => {
    if (isPanning) return 'cursor-grabbing';

    if (currentTool === 'SELECT') {
      if (hoveredHandle === 'rotate') return 'cursor-grab';
      if (hoveredHandle === 'nw' || hoveredHandle === 'se') return 'cursor-nwse-resize';
      if (hoveredHandle === 'ne' || hoveredHandle === 'sw') return 'cursor-nesw-resize';
      if (hoveredHandle === 'n' || hoveredHandle === 's') return 'cursor-ns-resize';
      if (hoveredHandle === 'e' || hoveredHandle === 'w') return 'cursor-ew-resize';
      return 'cursor-default';
    }

    switch (currentTool) {
      case 'PAN':
        return 'cursor-grab';
      case 'TEXT':
        return 'cursor-text';
      case 'PEN':
      case 'PENCIL':
      case 'HIGHLIGHTER':
      case 'ERASER':
      case 'OBJECT_ERASER':
      case 'SHAPE_2D':
      case 'SHAPE_3D':
      case 'MATH_TOOL':
      case 'PHYSICS_TOOL':
      case 'IMAGE':
      case 'LASER':
      default:
        return 'cursor-crosshair';
    }
  }, [currentTool, isPanning, hoveredHandle]);

  // Mouse & Touch Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) {
      return;
    }

    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const coords = getCanvasCoords(e.clientX, e.clientY);
    startPointRef.current = coords;

    if (currentTool === 'PAN' || e.button === 1) {
      isPanningRef.current = true;
      setIsPanning(true);
      return;
    }

    if (currentTool === 'LASER') {
      laserPointsRef.current.push({ x: coords.x, y: coords.y, time: Date.now() });
      return;
    }

    if (currentTool === 'SELECT') {
      // 1. Check if user clicked on any Handle of the selected element
      if (selectedElementId) {
        const selectedEl = elements.find((x) => x.id === selectedElementId);
        if (selectedEl) {
          const hitHandle = hitTestHandles(coords.x, coords.y, selectedEl);
          if (hitHandle) {
            activeHandleRef.current = hitHandle;
            const w = 'width' in selectedEl ? selectedEl.width : 100;
            const h = elementH(selectedEl);
            const rot = ('rotation' in selectedEl ? (selectedEl as ImageElement).rotation : 0) || 0;
            const isLocked = ('lockAspectRatio' in selectedEl ? (selectedEl as ImageElement).lockAspectRatio !== false : false);

            resizeInitialRef.current = {
              x: 'x' in selectedEl ? selectedEl.x : 0,
              y: 'y' in selectedEl ? selectedEl.y : 0,
              width: w,
              height: h,
              rotation: rot,
              aspectRatio: w / Math.max(1, h),
              lockAspectRatio: isLocked,
              center: {
                x: ('x' in selectedEl ? selectedEl.x : 0) + w / 2,
                y: ('y' in selectedEl ? selectedEl.y : 0) + h / 2,
              },
            };

            if (hitHandle === 'rotate') {
              interactionModeRef.current = 'ROTATING';
            } else {
              interactionModeRef.current = 'RESIZING';
            }
            hasMovedOrTransformedRef.current = false;
            return;
          }
        }
      }

      // 2. Hit test top-most element on canvas
      const hit = hitTestElement(coords.x, coords.y, elementsRef.current);
      if (hit) {
        onSelectElement(hit.id);
        interactionModeRef.current = 'DRAGGING';
        hasMovedOrTransformedRef.current = false;
        if (hit.type === 'STROKE') {
          dragOffsetRef.current = { x: coords.x, y: coords.y };
        } else {
          dragOffsetRef.current = {
            x: coords.x - ('x' in hit ? hit.x : 0),
            y: coords.y - ('y' in hit ? hit.y : 0),
          };
        }
      } else {
        onSelectElement(null);
        interactionModeRef.current = 'NONE';
        hasMovedOrTransformedRef.current = false;
      }
      return;
    }

    if (currentTool === 'ERASER') {
      isErasingRef.current = true;
      setIsErasing(true);
      eraserCursorPosRef.current = coords;
      lastEraserPosRef.current = coords;

      if (onSetElements) {
        onSetElements(elementsRef.current, true);
      }

      const { newElements, hasChanged } = eraseElementsInPath(
        elementsRef.current,
        coords,
        coords,
        eraserSize
      );

      if (hasChanged) {
        elementsRef.current = newElements;
      }
      renderCanvas();
      return;
    }

    if (currentTool === 'PEN' || currentTool === 'PENCIL' || currentTool === 'HIGHLIGHTER') {
      isDrawingRef.current = true;
      setIsDrawing(true);
      currentStrokePoints.current = [{ x: coords.x, y: coords.y, pressure: e.pressure || 0.5 }];
      renderCanvas();
      return;
    }

    if (
      currentTool === 'SHAPE_2D' ||
      currentTool === 'SHAPE_3D' ||
      currentTool === 'MATH_TOOL' ||
      currentTool === 'PHYSICS_TOOL'
    ) {
      isDrawingRef.current = true;
      setIsDrawing(true);
      previewShapeRef.current = { x: coords.x, y: coords.y, w: 20, h: 20 };
      return;
    }

    if (currentTool === 'TEXT') {
      const userText = prompt('Enter Whiteboard Text:');
      if (userText && userText.trim()) {
        const textEl: TextElement = {
          id: 'text_' + Date.now(),
          type: 'TEXT',
          x: coords.x,
          y: coords.y,
          text: userText.trim(),
          fontSize: 24,
          fontFamily: 'sans-serif',
          color,
          bold: true,
        };
        onAddElement(textEl);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      if (
        isDrawingRef.current ||
        isErasingRef.current ||
        interactionModeRef.current !== 'NONE' ||
        isPanningRef.current
      ) {
        finalizeAction();
        return;
      }
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);

    // Hover handle detection when not actively interacting
    if (currentTool === 'SELECT' && interactionModeRef.current === 'NONE' && selectedElementId) {
      const selectedEl = elements.find((x) => x.id === selectedElementId);
      if (selectedEl) {
        const hit = hitTestHandles(coords.x, coords.y, selectedEl);
        setHoveredHandle(hit);
      } else {
        setHoveredHandle(null);
      }
    }

    if (isPanningRef.current) {
      setPan((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
      return;
    }

    if (currentTool === 'LASER') {
      laserPointsRef.current.push({ x: coords.x, y: coords.y, time: Date.now() });
      return;
    }

    if (currentTool === 'ERASER') {
      eraserCursorPosRef.current = coords;
      if (isErasingRef.current && lastEraserPosRef.current) {
        const { newElements, hasChanged } = eraseElementsInPath(
          elementsRef.current,
          lastEraserPosRef.current,
          coords,
          eraserSize
        );

        if (hasChanged) {
          elementsRef.current = newElements;
        }
        lastEraserPosRef.current = coords;
      }
      renderCanvas();
      return;
    }

    // ROTATING SELECTED ELEMENT
    if (interactionModeRef.current === 'ROTATING' && selectedElementId) {
      const idx = elementsRef.current.findIndex((x) => x.id === selectedElementId);
      if (idx !== -1) {
        const el = elementsRef.current[idx];
        if ('rotation' in el || el.type === 'IMAGE' || el.type === 'SHAPE_2D' || el.type === 'SHAPE_3D') {
          const initial = resizeInitialRef.current;
          const dx = coords.x - initial.center.x;
          const dy = coords.y - initial.center.y;
          const rad = Math.atan2(dy, dx);
          let deg = (rad * 180) / Math.PI + 90; // Align straight up = 0 deg
          if (deg > 180) deg -= 360;
          if (deg < -180) deg += 360;

          // Snap to 0, 45, 90, 180, -90, -45 degrees if close
          if (Math.abs(deg) < 4) deg = 0;
          else if (Math.abs(deg - 90) < 4) deg = 90;
          else if (Math.abs(deg + 90) < 4) deg = -90;
          else if (Math.abs(deg - 180) < 4 || Math.abs(deg + 180) < 4) deg = 180;
          else if (Math.abs(deg - 45) < 4) deg = 45;
          else if (Math.abs(deg + 45) < 4) deg = -45;

          const updatedEl = {
            ...el,
            rotation: Math.round(deg),
          } as WhiteboardElement;
          elementsRef.current[idx] = updatedEl;
          hasMovedOrTransformedRef.current = true;
          renderCanvas();
        }
      }
      return;
    }

    // RESIZING SELECTED ELEMENT
    if (interactionModeRef.current === 'RESIZING' && selectedElementId && activeHandleRef.current) {
      const idx = elementsRef.current.findIndex((x) => x.id === selectedElementId);
      if (idx !== -1) {
        const el = elementsRef.current[idx];
        if ('width' in el && 'height' in el) {
          const handle = activeHandleRef.current as ResizeHandle;
          const init = resizeInitialRef.current;

          // Transform mouse point to local unrotated space relative to element center
          const rotRad = ((init.rotation || 0) * Math.PI) / 180;
          const cos = Math.cos(rotRad);
          const sin = Math.sin(rotRad);

          const dx = coords.x - init.center.x;
          const dy = coords.y - init.center.y;

          const localX = dx * cos + dy * sin;
          const localY = -dx * sin + dy * cos;

          let newW = init.width;
          let newH = init.height;

          if (handle.includes('e')) newW = Math.max(24, localX + init.width / 2);
          if (handle.includes('w')) newW = Math.max(24, init.width / 2 - localX);
          if (handle.includes('s')) newH = Math.max(24, localY + init.height / 2);
          if (handle.includes('n')) newH = Math.max(24, init.height / 2 - localY);

          // Aspect ratio locking
          const shouldLock = e.shiftKey || init.lockAspectRatio;
          if (shouldLock && init.aspectRatio) {
            if (handle === 'e' || handle === 'w') {
              newH = Math.round(newW / init.aspectRatio);
            } else if (handle === 'n' || handle === 's') {
              newW = Math.round(newH * init.aspectRatio);
            } else {
              // Corner handles
              newH = Math.round(newW / init.aspectRatio);
            }
          }

          // Keep center stable
          const newX = init.center.x - newW / 2;
          const newY = init.center.y - newH / 2;

          const updatedEl = {
            ...el,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH),
          } as WhiteboardElement;
          elementsRef.current[idx] = updatedEl;
          hasMovedOrTransformedRef.current = true;
          renderCanvas();
        }
      }
      return;
    }

    // DRAGGING SELECTED ELEMENT (Instantaneous 60/120fps Cursor Tracking)
    if (interactionModeRef.current === 'DRAGGING' && selectedElementId) {
      const idx = elementsRef.current.findIndex((x) => x.id === selectedElementId);
      if (idx !== -1) {
        const el = elementsRef.current[idx];
        if (el.type === 'STROKE') {
          const dx = coords.x - dragOffsetRef.current.x;
          const dy = coords.y - dragOffsetRef.current.y;
          if (dx !== 0 || dy !== 0) {
            const stroke = el as FreehandStroke;
            const updatedStroke: FreehandStroke = {
              ...stroke,
              points: stroke.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
            };
            elementsRef.current[idx] = updatedStroke;
            dragOffsetRef.current = { x: coords.x, y: coords.y };
            hasMovedOrTransformedRef.current = true;
            renderCanvas();
          }
        } else if ('x' in el && 'y' in el) {
          const newX = Math.round(coords.x - dragOffsetRef.current.x);
          const newY = Math.round(coords.y - dragOffsetRef.current.y);
          if (el.x !== newX || el.y !== newY) {
            const updatedEl = {
              ...el,
              x: newX,
              y: newY,
            } as WhiteboardElement;
            elementsRef.current[idx] = updatedEl;
            hasMovedOrTransformedRef.current = true;
            renderCanvas();
          }
        }
      }
      return;
    }

    // DRAWING NEW ELEMENT
    if (isDrawingRef.current) {
      if (currentTool === 'PEN' || currentTool === 'PENCIL' || currentTool === 'HIGHLIGHTER') {
        currentStrokePoints.current.push({
          x: coords.x,
          y: coords.y,
          pressure: e.pressure || 0.5,
        });
        renderCanvas();
      } else if (
        currentTool === 'SHAPE_2D' ||
        currentTool === 'SHAPE_3D' ||
        currentTool === 'MATH_TOOL' ||
        currentTool === 'PHYSICS_TOOL'
      ) {
        const sx = startPointRef.current.x;
        const sy = startPointRef.current.y;
        const w = coords.x - sx;
        const h = coords.y - sy;
        previewShapeRef.current = {
          x: w < 0 ? coords.x : sx,
          y: h < 0 ? coords.y : sy,
          w: Math.abs(w),
          h: Math.abs(h),
        };
        renderCanvas();
      }
    }
  };

  const handlePointerUp = () => {
    finalizeAction();
  };

  const handlePointerCancel = () => {
    finalizeAction();
  };

  const handleLostPointerCapture = () => {
    finalizeAction();
  };

  const handlePointerLeave = () => {
    if (isErasingRef.current) {
      finalizeAction();
    }
    eraserCursorPosRef.current = null;
    setHoveredHandle(null);
    renderCanvas();
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (currentTool === 'ERASER') {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      eraserCursorPosRef.current = coords;
      renderCanvas();
    }
  };

  // Drag & Drop Image File directly onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        try {
          const dataUrl = await readFileAsDataURL(file);
          const { width, height } = await loadImageDimensions(dataUrl);
          const dropCoords = getCanvasCoords(e.clientX, e.clientY);
          const fitted = fitDimensions(width, height, 640, 480);

          const newImgEl: ImageElement = {
            id: 'img_' + Date.now(),
            type: 'IMAGE',
            x: Math.round(dropCoords.x - fitted.width / 2),
            y: Math.round(dropCoords.y - fitted.height / 2),
            width: fitted.width,
            height: fitted.height,
            src: dataUrl,
            fileName: file.name,
            lockAspectRatio: true,
            naturalWidth: width,
            naturalHeight: height,
            aspectRatio: width / height,
            rotation: 0,
            opacity: 1,
          };

          onAddElement(newImgEl);
          onSelectElement(newImgEl.id);
        } catch (err) {
          console.error('Failed to import dropped image', err);
        }
      }
    }
  };

  // Keyboard Shortcuts (Delete, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          selectedElementId &&
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        ) {
          onDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        onSelectElement(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, onDeleteSelected, onSelectElement]);

  return (
    <div
      ref={containerRef}
      className={`relative z-10 w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 select-none ${getCanvasCursorClass()}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 16:9 Aspect Ratio Canvas Stage */}
      <div
        ref={stageRef}
        className="relative aspect-video w-full max-h-full max-w-[98vw] shadow-2xl rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handleLostPointerCapture}
          onPointerLeave={handlePointerLeave}
          onPointerEnter={handlePointerEnter}
          className={`w-full h-full touch-none block ${getCanvasCursorClass()}`}
        />

        {/* Dropzone Glow Overlay */}
        {isDragOverCanvas && (
          <div className="absolute inset-0 z-30 bg-indigo-950/70 border-4 border-dashed border-indigo-400 rounded-2xl flex flex-col items-center justify-center text-white backdrop-blur-xs pointer-events-none animate-in fade-in">
            <UploadCloud className="w-16 h-16 text-indigo-400 animate-bounce mb-2" />
            <h3 className="text-xl font-bold tracking-wide">Drop Image to Insert as Layer</h3>
            <p className="text-sm text-indigo-200 mt-1">Image will be added as a separate movable &amp; resizable object</p>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// SELECTION BOX & INTERACTIVE HANDLES RENDERING (Supports Rotation)
// =========================================================================
function drawSelectionBox(ctx: CanvasRenderingContext2D, element: WhiteboardElement) {
  let x = 0;
  let y = 0;
  let w = 100;
  let h = 40;
  let rotation = 0;

  if (element.type === 'STROKE') {
    const pts = (element as FreehandStroke).points;
    if (!pts || pts.length === 0) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    x = minX;
    y = minY;
    w = Math.max(16, maxX - minX);
    h = Math.max(16, maxY - minY);
  } else if ('x' in element && 'y' in element) {
    x = element.x;
    y = element.y;
    w = 'width' in element ? element.width : 100;
    h = elementH(element);
    if ('rotation' in element && typeof element.rotation === 'number') {
      rotation = element.rotation;
    }
  }

  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.translate(cx, cy);

  if (rotation) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // Draw Bounding Box Outline
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);

  // Rotation Handle Arm & Circle (Lollipop)
  ctx.setLineDash([]);
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 - 4);
  ctx.lineTo(0, -h / 2 - 28);
  ctx.stroke();

  // Rotation Circle Handle
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -h / 2 - 28, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 8 Resize Handles (4 corners + 4 edges)
  const handles = [
    { lx: -w / 2 - 4, ly: -h / 2 - 4 }, // nw
    { lx: 0, ly: -h / 2 - 4 },          // n
    { lx: w / 2 + 4, ly: -h / 2 - 4 },  // ne
    { lx: w / 2 + 4, ly: 0 },           // e
    { lx: w / 2 + 4, ly: h / 2 + 4 },   // se
    { lx: 0, ly: h / 2 + 4 },           // s
    { lx: -w / 2 - 4, ly: h / 2 + 4 },  // sw
    { lx: -w / 2 - 4, ly: 0 },          // w
  ];

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2;

  handles.forEach(({ lx, ly }) => {
    ctx.fillRect(lx - 4, ly - 4, 8, 8);
    ctx.strokeRect(lx - 4, ly - 4, 8, 8);
  });

  ctx.restore();
}

// Hit Testing Handles of Selected Element
function hitTestHandles(
  px: number,
  py: number,
  element: WhiteboardElement
): HandleType | null {
  if (element.type === 'STROKE') return null;
  if (!('x' in element && 'y' in element)) return null;

  const x = element.x;
  const y = element.y;
  const w = 'width' in element ? element.width : 100;
  const h = elementH(element);
  const rotation = ('rotation' in element && typeof element.rotation === 'number') ? element.rotation : 0;

  const cx = x + w / 2;
  const cy = y + h / 2;

  // Convert (px, py) to local coordinates
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = px - cx;
  const dy = py - cy;

  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  const hitDist = 9;

  // Check rotation handle at (0, -h/2 - 28)
  const rotDist2 = (lx - 0) ** 2 + (ly - (-h / 2 - 28)) ** 2;
  if (rotDist2 <= (hitDist + 3) ** 2) {
    return 'rotate';
  }

  // Check 8 resize handles
  const handleMap: { handle: ResizeHandle; hx: number; hy: number }[] = [
    { handle: 'nw', hx: -w / 2 - 4, hy: -h / 2 - 4 },
    { handle: 'n', hx: 0, hy: -h / 2 - 4 },
    { handle: 'ne', hx: w / 2 + 4, hy: -h / 2 - 4 },
    { handle: 'e', hx: w / 2 + 4, hy: 0 },
    { handle: 'se', hx: w / 2 + 4, hy: h / 2 + 4 },
    { handle: 's', hx: 0, hy: h / 2 + 4 },
    { handle: 'sw', hx: -w / 2 - 4, hy: h / 2 + 4 },
    { handle: 'w', hx: -w / 2 - 4, hy: 0 },
  ];

  for (const { handle, hx, hy } of handleMap) {
    if (Math.abs(lx - hx) <= hitDist && Math.abs(ly - hy) <= hitDist) {
      return handle;
    }
  }

  return null;
}

// Distance from point to line segment squared
function distToSegmentSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

// Element Selection Hit Testing (Supports Rotated Rectangles)
function hitTestElement(
  x: number,
  y: number,
  elements: WhiteboardElement[]
): WhiteboardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'STROKE') {
      const stroke = el as FreehandStroke;
      const pts = stroke.points;
      const effR = Math.max(12, (stroke.strokeWidth || 2) + 8);
      const effR2 = effR * effR;
      for (let j = 0; j < pts.length; j++) {
        const dx = pts[j].x - x;
        const dy = pts[j].y - y;
        if (dx * dx + dy * dy <= effR2) {
          return el;
        }
        if (j > 0) {
          if (distToSegmentSquared(x, y, pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y) <= effR2) {
            return el;
          }
        }
      }
    } else if ('x' in el && 'y' in el) {
      const w = 'width' in el ? el.width : 100;
      const h = elementH(el);
      const rot = ('rotation' in el && typeof el.rotation === 'number') ? el.rotation : 0;

      if (!rot) {
        if (x >= el.x - 8 && x <= el.x + w + 8 && y >= el.y - 8 && y <= el.y + h + 8) {
          return el;
        }
      } else {
        // Rotated hit test in local space
        const cx = el.x + w / 2;
        const cy = el.y + h / 2;
        const rad = (rot * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const dx = x - cx;
        const dy = y - cy;

        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;

        if (Math.abs(lx) <= w / 2 + 8 && Math.abs(ly) <= h / 2 + 8) {
          return el;
        }
      }
    }
  }
  return null;
}

function elementH(el: any): number {
  if ('height' in el) return el.height;
  if ('fontSize' in el) return el.fontSize * 1.5;
  return 40;
}

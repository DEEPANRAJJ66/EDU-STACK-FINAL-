import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  WhiteboardDocument,
  WhiteboardPage,
  WhiteboardElement,
  WhiteboardTool,
  Shape2DType,
  Shape3DType,
  MathToolType,
  PhysicsToolType,
  BoardTheme,
  MeasurementOverlayState,
} from './types';
import { WhiteboardToolbar } from './components/WhiteboardToolbar';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { WhiteboardPageTray } from './components/WhiteboardPageTray';
import { ObjectPropertyBar } from './components/ObjectPropertyBar';
import { MathFormulaModal } from './components/MathFormulaModal';
import { FunctionGrapherModal } from './components/FunctionGrapherModal';
import { PDFImportModal } from './components/PDFImportModal';
import { ImageImportModal } from './components/ImageImportModal';
import { MeasurementOverlay } from './tools/MeasurementOverlay';
import { renderSlideToCanvas } from './utils/renderSlide';
import { Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { safeStorage } from '../../utils/safeStorage';
import { ImageElement } from './types';
import {
  getInitialWhiteboardDoc,
  hydrateWhiteboardDoc,
  saveWhiteboardDocSync,
  saveDocumentToIndexedDB,
} from './utils/whiteboardStorage';

interface WhiteboardWorkspaceProps {
  userRole?: 'TEACHER' | 'STUDENT';
  userName?: string;
  onBackToTestSeries?: () => void;
}

// Initial Sample Slides for instant rich demonstration
const createDefaultPages = (): WhiteboardPage[] => [
  {
    id: 'page_1',
    title: 'Slide 1: JEE Mechanics & 3D Geometry',
    theme: 'SLATE_DARK',
    elements: [
      {
        id: 'title_1',
        type: 'TEXT',
        x: 80,
        y: 80,
        text: 'EduStack STEM Lecture: Rotational Dynamics & Solid Geometry',
        fontSize: 32,
        fontFamily: 'sans-serif',
        color: '#818cf8',
        bold: true,
      },
      {
        id: 'cube_demo',
        type: 'SHAPE_3D',
        shape: 'CUBE',
        x: 120,
        y: 180,
        width: 240,
        height: 240,
        depth: 240,
        rotX: -25,
        rotY: 40,
        rotZ: 0,
        color: '#c084fc',
        strokeWidth: 3,
        showHiddenEdges: true,
        showVertexLabels: true,
        label: 'Moment of Inertia Cube',
      },
      {
        id: 'fbd_demo',
        type: 'PHYSICS_OBJECT',
        physicsType: 'FBD_VECTOR',
        x: 480,
        y: 180,
        width: 280,
        height: 280,
        color: '#38bdf8',
        strokeWidth: 2.5,
        data: {
          forceName: 'F_app = 50 N',
          massValue: 'M = 10 kg',
        },
      },
      {
        id: 'plane_demo',
        type: 'PHYSICS_OBJECT',
        physicsType: 'INCLINED_PLANE',
        x: 840,
        y: 180,
        width: 320,
        height: 240,
        color: '#facc15',
        strokeWidth: 2.5,
        data: {
          angleDeg: 35,
          massValue: 'm',
        },
      },
      {
        id: 'formula_demo',
        type: 'TEXT',
        x: 120,
        y: 520,
        text: 'Newton\'s Law:  τ = I · α   |   Conservation of Angular Momentum:  L = r × p',
        fontSize: 22,
        fontFamily: 'sans-serif',
        color: '#4ade80',
        bold: true,
      },
    ],
    undoStack: [],
    redoStack: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'page_2',
    title: 'Slide 2: Calculus & Coordinate Geometry',
    theme: 'MATH_GRID',
    elements: [
      {
        id: 'xy_plane',
        type: 'MATH_OBJECT',
        mathType: 'COORDINATE_PLANE',
        x: 100,
        y: 100,
        width: 480,
        height: 400,
        color: '#38bdf8',
        strokeWidth: 2,
        data: {},
      },
      {
        id: 'func_sine',
        type: 'MATH_OBJECT',
        mathType: 'FUNCTION_GRAPH',
        x: 640,
        y: 100,
        width: 500,
        height: 380,
        color: '#f43f5e',
        strokeWidth: 3,
        data: {
          formula: 'sin(x)',
          xMin: -10,
          xMax: 10,
          yMin: -3,
          yMax: 3,
        },
      },
      {
        id: 'cone_3d',
        type: 'SHAPE_3D',
        shape: 'CONE',
        x: 1200,
        y: 120,
        width: 220,
        height: 320,
        rotX: -20,
        rotY: 30,
        rotZ: 0,
        color: '#fb923c',
        strokeWidth: 2.5,
        showHiddenEdges: true,
        showVertexLabels: false,
        label: 'Volume: V = (1/3)πr²h',
      },
    ],
    undoStack: [],
    redoStack: [],
    createdAt: new Date().toISOString(),
  },
];

export const WhiteboardWorkspace: React.FC<WhiteboardWorkspaceProps> = ({
  userRole = 'TEACHER',
  userName = 'Faculty Instructor',
  onBackToTestSeries,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Document State - loaded from persistent storage / cache
  const [doc, setDoc] = useState<WhiteboardDocument>(() => {
    return getInitialWhiteboardDoc(() => ({
      id: 'doc_' + Date.now(),
      title: 'JEE Main Master Class Whiteboard',
      pages: createDefaultPages(),
      activePageIndex: 0,
      theme: 'SLATE_DARK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  });

  // Hydrate from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    hydrateWhiteboardDoc().then((savedDoc) => {
      if (isMounted && savedDoc && Array.isArray(savedDoc.pages) && savedDoc.pages.length > 0) {
        setDoc((prev) => {
          // If the loaded IndexedDB doc is valid, merge or use it
          if (savedDoc.updatedAt && prev.updatedAt && savedDoc.updatedAt >= prev.updatedAt) {
            return savedDoc;
          }
          // If previous only had default sample slides, accept stored slides
          if (prev.id.startsWith('doc_') && savedDoc.pages.length >= prev.pages.length) {
            return savedDoc;
          }
          return prev;
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Save to persistent storage on every change: immediate sync cache + debounced IndexedDB
  useEffect(() => {
    saveWhiteboardDocSync(doc);
    const timer = setTimeout(() => {
      saveDocumentToIndexedDB(doc);
    }, 200);

    return () => {
      clearTimeout(timer);
      saveWhiteboardDocSync(doc);
      saveDocumentToIndexedDB(doc);
    };
  }, [doc]);

  // Active Page
  const activePage = doc.pages[doc.activePageIndex] || doc.pages[0];

  // Active Tool & State
  const [currentTool, setCurrentTool] = useState<WhiteboardTool>('PEN');
  const [selectedShape2D, setSelectedShape2D] = useState<Shape2DType>('RECTANGLE');
  const [selectedShape3D, setSelectedShape3D] = useState<Shape3DType>('CUBE');
  const [selectedMathTool, setSelectedMathTool] = useState<MathToolType>('COORDINATE_PLANE');
  const [selectedPhysicsTool, setSelectedPhysicsTool] = useState<PhysicsToolType>('FBD_VECTOR');
  const [color, setColor] = useState<string>('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState<number>(1.5);
  const [eraserSize, setEraserSize] = useState<number>(24);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Measurement Overlays (Ruler & Protractor)
  const [measurementState, setMeasurementState] = useState<MeasurementOverlayState>({
    rulerVisible: false,
    rulerX: 180,
    rulerY: 180,
    rulerAngle: 0,
    rulerLength: 480,
    protractorVisible: false,
    protractorX: 600,
    protractorY: 300,
    protractorAngle: 0,
    protractorRadius: 150,
  });

  // Modal states
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isGrapherModalOpen, setIsGrapherModalOpen] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Synchronize fullscreen state on native escape / fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Flush persistence on window beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveWhiteboardDocSync(doc);
      saveDocumentToIndexedDB(doc);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [doc]);

  // Selected element reference
  const selectedElement = activePage.elements.find((el) => el.id === selectedElementId) || null;

  // Add Element with Undo History
  const handleAddElement = useCallback((element: WhiteboardElement) => {
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };

      page.undoStack = [...(page.undoStack || []), page.elements];
      page.redoStack = [];
      page.elements = [...page.elements, element];
      pages[prev.activePageIndex] = page;

      return { ...prev, pages, updatedAt: new Date().toISOString() };
    });
  }, []);

  // Insert Image as distinct Layer (placed on top/uppermost layer of active slide)
  const handleInsertImage = useCallback(
    (imgData: {
      src: string;
      width: number;
      height: number;
      fileName?: string;
      lockAspectRatio?: boolean;
      isBackground?: boolean;
      id?: string;
      x?: number;
      y?: number;
      rotation?: number;
      opacity?: number;
    } | ImageElement) => {
      if ('isBackground' in imgData && imgData.isBackground) {
        setDoc((prev) => {
          const pages = [...prev.pages];
          const page = { ...pages[prev.activePageIndex] };
          page.backgroundImage = imgData.src;
          pages[prev.activePageIndex] = page;
          return { ...prev, pages, updatedAt: new Date().toISOString() };
        });
        return;
      }

      const w = imgData.width || 640;
      const h = imgData.height || 480;
      const x = typeof (imgData as any).x === 'number' ? (imgData as any).x : Math.max(40, Math.round((1920 - w) / 2));
      const y = typeof (imgData as any).y === 'number' ? (imgData as any).y : Math.max(40, Math.round((1080 - h) / 2));

      const newImageElement: ImageElement = {
        id: (imgData as any).id || 'img_' + Date.now(),
        type: 'IMAGE',
        x,
        y,
        width: w,
        height: h,
        src: imgData.src,
        fileName: imgData.fileName || 'Imported_Image.png',
        lockAspectRatio: imgData.lockAspectRatio !== false,
        naturalWidth: w,
        naturalHeight: h,
        aspectRatio: w / Math.max(1, h),
        rotation: typeof (imgData as any).rotation === 'number' ? (imgData as any).rotation : 0,
        opacity: typeof (imgData as any).opacity === 'number' ? (imgData as any).opacity : 1,
      };

      // Place automatically on top/uppermost layer (end of elements array)
      setDoc((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.activePageIndex] };

        page.undoStack = [...(page.undoStack || []), page.elements];
        page.redoStack = [];
        // Appending to the end puts it at the topmost visual layer above all existing items
        page.elements = [...page.elements, newImageElement];
        pages[prev.activePageIndex] = page;

        return { ...prev, pages, updatedAt: new Date().toISOString() };
      });

      setSelectedElementId(newImageElement.id);
    },
    []
  );

  // Update Element
  const handleUpdateElement = useCallback((updated: WhiteboardElement) => {
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };

      page.elements = page.elements.map((el) => (el.id === updated.id ? updated : el));
      pages[prev.activePageIndex] = page;
      return { ...prev, pages, updatedAt: new Date().toISOString() };
    });
  }, []);

  // Batch Replace Elements (Used for live drawing operations, partial erasing, and transformations)
  const handleSetElements = useCallback((newElements: WhiteboardElement[], saveHistory: boolean = false) => {
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };

      if (saveHistory) {
        page.undoStack = [...(page.undoStack || []), page.elements];
        page.redoStack = [];
      }
      page.elements = newElements;
      pages[prev.activePageIndex] = page;
      return { ...prev, pages, updatedAt: new Date().toISOString() };
    });
  }, []);

  // Delete elements by array of IDs (used by precision Eraser)
  const handleDeleteElements = useCallback((idsToDelete: string[]) => {
    if (!idsToDelete || idsToDelete.length === 0) return;
    const idSet = new Set(idsToDelete);

    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      const remaining = page.elements.filter((el) => !idSet.has(el.id));
      if (remaining.length === page.elements.length) return prev;

      page.undoStack = [...(page.undoStack || []), page.elements];
      page.redoStack = [];
      page.elements = remaining;
      pages[prev.activePageIndex] = page;
      return { ...prev, pages, updatedAt: new Date().toISOString() };
    });

    setSelectedElementId((prevSelected) =>
      prevSelected && idSet.has(prevSelected) ? null : prevSelected
    );
  }, []);

  // Delete Selected Element
  const handleDeleteSelected = useCallback(() => {
    if (!selectedElementId) return;
    handleDeleteElements([selectedElementId]);
  }, [selectedElementId, handleDeleteElements]);

  // Duplicate Selected Element
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedElement) return;
    const cloned = {
      ...selectedElement,
      id: 'clone_' + Date.now(),
      x: ('x' in selectedElement ? selectedElement.x : 0) + 30,
      y: ('y' in selectedElement ? selectedElement.y : 0) + 30,
    } as WhiteboardElement;
    handleAddElement(cloned);
    setSelectedElementId(cloned.id);
  }, [selectedElement, handleAddElement]);

  // Layer Reordering
  const handleBringForward = useCallback(() => {
    if (!selectedElementId) return;
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      const idx = page.elements.findIndex((e) => e.id === selectedElementId);
      if (idx < page.elements.length - 1 && idx >= 0) {
        const next = [...page.elements];
        const item = next[idx];
        next[idx] = next[idx + 1];
        next[idx + 1] = item;
        page.elements = next;
        pages[prev.activePageIndex] = page;
      }
      return { ...prev, pages };
    });
  }, [selectedElementId]);

  const handleSendBackward = useCallback(() => {
    if (!selectedElementId) return;
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      const idx = page.elements.findIndex((e) => e.id === selectedElementId);
      if (idx > 0) {
        const next = [...page.elements];
        const item = next[idx];
        next[idx] = next[idx - 1];
        next[idx - 1] = item;
        page.elements = next;
        pages[prev.activePageIndex] = page;
      }
      return { ...prev, pages };
    });
  }, [selectedElementId]);

  const handleBringToFront = useCallback(() => {
    if (!selectedElementId) return;
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      const idx = page.elements.findIndex((e) => e.id === selectedElementId);
      if (idx >= 0 && idx < page.elements.length - 1) {
        const item = page.elements[idx];
        const remaining = page.elements.filter((e) => e.id !== selectedElementId);
        page.elements = [...remaining, item];
        pages[prev.activePageIndex] = page;
      }
      return { ...prev, pages };
    });
  }, [selectedElementId]);

  const handleSendToBack = useCallback(() => {
    if (!selectedElementId) return;
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      const idx = page.elements.findIndex((e) => e.id === selectedElementId);
      if (idx > 0) {
        const item = page.elements[idx];
        const remaining = page.elements.filter((e) => e.id !== selectedElementId);
        page.elements = [item, ...remaining];
        pages[prev.activePageIndex] = page;
      }
      return { ...prev, pages };
    });
  }, [selectedElementId]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      if (!page.undoStack || page.undoStack.length === 0) return prev;

      const previousElements = page.undoStack[page.undoStack.length - 1];
      page.redoStack = [...(page.redoStack || []), page.elements];
      page.undoStack = page.undoStack.slice(0, -1);
      page.elements = previousElements;
      pages[prev.activePageIndex] = page;

      return { ...prev, pages };
    });
    setSelectedElementId(null);
  }, []);

  const handleRedo = useCallback(() => {
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      if (!page.redoStack || page.redoStack.length === 0) return prev;

      const nextElements = page.redoStack[page.redoStack.length - 1];
      page.undoStack = [...(page.undoStack || []), page.elements];
      page.redoStack = page.redoStack.slice(0, -1);
      page.elements = nextElements;
      pages[prev.activePageIndex] = page;

      return { ...prev, pages };
    });
    setSelectedElementId(null);
  }, []);

  // Clear Page
  const handleClearPage = useCallback(() => {
    if (!window.confirm('Clear all drawings and annotations on this slide?')) return;
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      page.undoStack = [...(page.undoStack || []), page.elements];
      page.redoStack = [];
      page.elements = [];
      pages[prev.activePageIndex] = page;
      return { ...prev, pages };
    });
    setSelectedElementId(null);
  }, []);

  // Theme Change
  const handleChangeTheme = useCallback((theme: BoardTheme) => {
    setDoc((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.activePageIndex] };
      page.theme = theme;
      pages[prev.activePageIndex] = page;
      return { ...prev, pages, theme };
    });
  }, []);

  // Page Management
  const handleSelectPage = (index: number) => {
    setDoc((prev) => ({ ...prev, activePageIndex: index }));
    setSelectedElementId(null);
  };

  const handleAddPage = () => {
    setDoc((prev) => {
      const insertIndex = prev.activePageIndex + 1;
      const newPage: WhiteboardPage = {
        id: 'page_' + Date.now(),
        title: `Slide ${insertIndex + 1}`,
        theme: prev.theme || 'SLATE_DARK',
        elements: [],
        undoStack: [],
        redoStack: [],
        createdAt: new Date().toISOString(),
      };
      const pages = [...prev.pages];
      pages.splice(insertIndex, 0, newPage);

      return {
        ...prev,
        pages,
        activePageIndex: insertIndex,
        updatedAt: new Date().toISOString(),
      };
    });
    setSelectedElementId(null);
  };

  const handleDuplicatePage = (index: number) => {
    setDoc((prev) => {
      const source = prev.pages[index];
      const clonedPage: WhiteboardPage = {
        ...source,
        id: 'page_' + Date.now(),
        title: `${source.title} (Copy)`,
        elements: JSON.parse(JSON.stringify(source.elements)),
        undoStack: [],
        redoStack: [],
        createdAt: new Date().toISOString(),
      };
      const pages = [...prev.pages];
      pages.splice(index + 1, 0, clonedPage);
      return { ...prev, pages, activePageIndex: index + 1 };
    });
    setSelectedElementId(null);
  };

  const handleDeletePage = (index: number) => {
    if (doc.pages.length <= 1) {
      alert('Cannot delete the only slide.');
      return;
    }
    setDoc((prev) => {
      const pages = prev.pages.filter((_, i) => i !== index);
      const activePageIndex = Math.min(prev.activePageIndex, pages.length - 1);
      return { ...prev, pages, activePageIndex };
    });
    setSelectedElementId(null);
  };

  // Import PDF pages as slides
  const handleImportPDFPages = (pageImages: string[], fileName: string) => {
    setDoc((prev) => {
      const newPages: WhiteboardPage[] = pageImages.map((dataUrl, idx) => ({
        id: 'pdf_page_' + Date.now() + '_' + idx,
        title: `${fileName} - Slide ${idx + 1}`,
        theme: 'WHITEBOARD',
        backgroundImage: dataUrl,
        elements: [],
        undoStack: [],
        redoStack: [],
        createdAt: new Date().toISOString(),
      }));

      return {
        ...prev,
        pages: [...prev.pages, ...newPages],
        activePageIndex: prev.pages.length,
      };
    });
  };

  // Export Slide as High-Res 1920x1080 PNG Image
  const handleExportPNG = async () => {
    try {
      const slideCanvas = await renderSlideToCanvas(
        activePage,
        doc.theme || 'SLATE_DARK',
        1920,
        1080
      );
      const link = document.createElement('a');
      const safeTitle = (activePage.title || 'Slide').replace(/[^a-z0-9_-]/gi, '_');
      link.download = `EduStack_${safeTitle}.png`;
      link.href = slideCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('PNG export failed', err);
      // Fallback
      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      const fallbackTitle = (activePage?.title || 'Slide').replace(/\s+/g, '_');
      link.download = `EduStack_Whiteboard_${fallbackTitle}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  // Export All Slides as Multi-Page PDF
  // Flow: Get all slides -> For each slide -> Load/render ONLY that slide's objects -> Wait until rendering is complete -> Capture/render slide -> Add one PDF page -> Clear/switch to next slide -> Repeat -> Save PDF
  const handleExportPDF = async () => {
    if (exportProgress) return;

    // 1. Get all slides
    const slides = doc.pages;
    if (!slides || slides.length === 0) {
      alert('No slides available to export.');
      return;
    }

    try {
      setExportProgress({
        current: 0,
        total: slides.length,
        message: 'Initializing presentation PDF...',
      });

      // Initialize PDF document in 16:9 Landscape (1920 x 1080 px)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080],
        compress: true,
      });

      // 2. Loop through each slide
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slideTitle = slide.title || `Slide ${i + 1}`;

        setExportProgress({
          current: i + 1,
          total: slides.length,
          message: `Rendering slide ${i + 1} of ${slides.length} ("${slideTitle}")...`,
        });

        // 3 & 4. Load & render ONLY that slide's objects onto dedicated off-screen canvas & wait for completion
        const slideCanvas = await renderSlideToCanvas(
          slide,
          doc.theme || 'SLATE_DARK',
          1920,
          1080
        );

        // 5. Capture/render slide into high-quality image format
        const imgData = slideCanvas.toDataURL('image/jpeg', 0.95);

        // 6. Add one PDF page (if not first page)
        if (i > 0) {
          pdf.addPage([1920, 1080], 'landscape');
        }

        // Add captured slide image to PDF page
        pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080, undefined, 'FAST');

        // 7. Clear/switch to next slide (allow micro-tick for UI reactivity)
        await new Promise((resolve) => setTimeout(resolve, 40));
      }

      // 8. Repeat finished -> Save PDF
      setExportProgress({
        current: slides.length,
        total: slides.length,
        message: 'Finalizing and saving PDF document...',
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeDocTitle = (doc.title || 'EduStack_Lecture_Slides').replace(/[^a-z0-9_-]/gi, '_');
      pdf.save(`${safeDocTitle}_${dateStr}.pdf`);

      setTimeout(() => {
        setExportProgress(null);
      }, 500);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Export PDF encountered an error. Please try again.');
      setExportProgress(null);
    }
  };

  // Fullscreen Toggle
  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${
        isFullscreen ? 'h-screen w-screen' : 'h-[calc(100vh-4rem)]'
      } flex flex-col bg-slate-950 overflow-hidden font-sans select-none`}
    >
      {/* 1. TOP WHITEBOARD TOOLBAR */}
      <WhiteboardToolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        selectedShape2D={selectedShape2D}
        onSelectShape2D={setSelectedShape2D}
        selectedShape3D={selectedShape3D}
        onSelectShape3D={setSelectedShape3D}
        selectedMathTool={selectedMathTool}
        onSelectMathTool={setSelectedMathTool}
        selectedPhysicsTool={selectedPhysicsTool}
        onSelectPhysicsTool={setSelectedPhysicsTool}
        color={color}
        onChangeColor={setColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        eraserSize={eraserSize}
        onChangeEraserSize={setEraserSize}
        boardTheme={activePage.theme || doc.theme || 'SLATE_DARK'}
        onChangeBoardTheme={handleChangeTheme}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={(activePage.undoStack?.length || 0) > 0}
        canRedo={(activePage.redoStack?.length || 0) > 0}
        hasSelectedElement={Boolean(selectedElementId)}
        onDeleteSelected={handleDeleteSelected}
        onClearPage={handleClearPage}
        onOpenFormulaModal={() => setIsFormulaModalOpen(true)}
        onOpenGrapherModal={() => setIsGrapherModalOpen(true)}
        onOpenPDFModal={() => setIsPDFModalOpen(true)}
        onOpenImageModal={() => setIsImageModalOpen(true)}
        onToggleRuler={() =>
          setMeasurementState((prev) => ({ ...prev, rulerVisible: !prev.rulerVisible }))
        }
        isRulerActive={measurementState.rulerVisible}
        onToggleProtractor={() =>
          setMeasurementState((prev) => ({ ...prev, protractorVisible: !prev.protractorVisible }))
        }
        isProtractorActive={measurementState.protractorVisible}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* 2. MAIN 16:9 INTERACTIVE WHITEBOARD CANVAS */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-2">
        <WhiteboardCanvas
          elements={activePage.elements}
          backgroundImage={activePage.backgroundImage}
          theme={activePage.theme || doc.theme || 'SLATE_DARK'}
          currentTool={currentTool}
          selectedShape2D={selectedShape2D}
          selectedShape3D={selectedShape3D}
          selectedMathTool={selectedMathTool}
          selectedPhysicsTool={selectedPhysicsTool}
          color={color}
          strokeWidth={strokeWidth}
          eraserSize={eraserSize}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onAddElement={handleAddElement}
          onUpdateElement={handleUpdateElement}
          onSetElements={handleSetElements}
          onDeleteElements={handleDeleteElements}
          onDeleteSelected={handleDeleteSelected}
        />

        {/* 3. MEASUREMENT OVERLAYS (Ruler & Protractor) */}
        <MeasurementOverlay
          state={measurementState}
          onChange={(newState) => setMeasurementState((prev) => ({ ...prev, ...newState }))}
          onCloseRuler={() => setMeasurementState((prev) => ({ ...prev, rulerVisible: false }))}
          onCloseProtractor={() =>
            setMeasurementState((prev) => ({ ...prev, protractorVisible: false }))
          }
        />

        {/* 4. CONTEXTUAL OBJECT PROPERTY BAR */}
        <ObjectPropertyBar
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteSelected}
          onDuplicateElement={handleDuplicateSelected}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
        />
      </div>

      {/* 5. BOTTOM MULTI-PAGE SLIDE TRAY */}
      <WhiteboardPageTray
        pages={doc.pages}
        activePageIndex={doc.activePageIndex}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
      />

      {/* 6. MODALS */}
      <MathFormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        onInsertFormula={(latex, fSize, fColor) => {
          handleAddElement({
            id: 'formula_' + Date.now(),
            type: 'TEXT',
            x: 400,
            y: 300,
            text: latex,
            fontSize: fSize,
            fontFamily: 'KaTeX_Main, serif',
            color: fColor,
            bold: true,
            isKaTeX: true,
          });
        }}
      />

      <FunctionGrapherModal
        isOpen={isGrapherModalOpen}
        onClose={() => setIsGrapherModalOpen(false)}
        onInsertGraph={(data) => {
          handleAddElement({
            id: 'graph_' + Date.now(),
            type: 'MATH_OBJECT',
            mathType: 'FUNCTION_GRAPH',
            x: 350,
            y: 200,
            width: 500,
            height: 360,
            color: data.color,
            strokeWidth: 3,
            data: {
              formula: data.formula,
              xMin: data.xMin,
              xMax: data.xMax,
              yMin: data.yMin,
              yMax: data.yMax,
            },
          });
        }}
      />

      <PDFImportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        onImportPages={handleImportPDFPages}
      />

      <ImageImportModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsertImage={handleInsertImage}
      />

      {/* 7. PDF EXPORT PROGRESS OVERLAY */}
      {exportProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4 text-white">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Exporting Presentation PDF</h3>
              <p className="text-xs text-slate-400 mt-1 truncate px-2">{exportProgress.message}</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-indigo-500 to-sky-400 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(5, (exportProgress.current / Math.max(1, exportProgress.total)) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>
                Slide {exportProgress.current} / {exportProgress.total}
              </span>
              <span>
                {Math.round((exportProgress.current / Math.max(1, exportProgress.total)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

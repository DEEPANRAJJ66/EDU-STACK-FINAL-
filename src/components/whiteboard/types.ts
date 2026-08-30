export type WhiteboardTool =
  | 'SELECT'
  | 'PEN'
  | 'PENCIL'
  | 'HIGHLIGHTER'
  | 'ERASER'
  | 'OBJECT_ERASER'
  | 'SHAPE_2D'
  | 'SHAPE_3D'
  | 'MATH_TOOL'
  | 'PHYSICS_TOOL'
  | 'TEXT'
  | 'MATH_FORMULA'
  | 'MEASUREMENT'
  | 'IMAGE'
  | 'LASER'
  | 'PAN';

export type Shape2DType =
  | 'LINE'
  | 'ARROW'
  | 'DOUBLE_ARROW'
  | 'RECTANGLE'
  | 'ROUNDED_RECT'
  | 'SQUARE'
  | 'CIRCLE'
  | 'ELLIPSE'
  | 'TRIANGLE'
  | 'RIGHT_TRIANGLE'
  | 'PARALLELOGRAM'
  | 'RHOMBUS'
  | 'TRAPEZIUM'
  | 'PENTAGON'
  | 'HEXAGON'
  | 'OCTAGON'
  | 'ARC'
  | 'SECTOR';

export type Shape3DType =
  | 'CUBE'
  | 'CUBOID'
  | 'SPHERE'
  | 'CYLINDER'
  | 'CONE'
  | 'PRISM'
  | 'PYRAMID'
  | 'TETRAHEDRON'
  | 'HEMISPHERE';

export type MathToolType =
  | 'COORDINATE_PLANE'
  | 'FUNCTION_GRAPH'
  | 'VECTOR_ARROW'
  | 'NUMBER_LINE'
  | 'MATRIX_GRID'
  | 'TRIG_CIRCLE';

export type PhysicsToolType =
  | 'FBD_VECTOR'
  | 'BLOCK_MASS'
  | 'INCLINED_PLANE'
  | 'PULLEY_SYSTEM'
  | 'SPRING_MASS'
  | 'PROJECTILE_MOTION'
  | 'ELECTRIC_FIELD'
  | 'MAGNETIC_FIELD'
  | 'CIRCUIT_RESISTOR'
  | 'CIRCUIT_CAPACITOR'
  | 'CIRCUIT_INDUCTOR'
  | 'CIRCUIT_BATTERY'
  | 'CIRCUIT_AC_SOURCE'
  | 'CIRCUIT_SWITCH';

export type MeasurementToolType =
  | 'RULER'
  | 'PROTRACTOR'
  | 'ANGLE_DIMENSION'
  | 'DISTANCE_DIMENSION';

export type BoardTheme =
  | 'WHITEBOARD'
  | 'BLACKBOARD'
  | 'SLATE_DARK'
  | 'MATH_GRID'
  | 'DOT_GRID'
  | 'ISOMETRIC'
  | 'RULED_PAPER';

export interface Point {
  x: number;
  y: number;
}

export interface FreehandStroke {
  id: string;
  type: 'STROKE';
  tool: 'PEN' | 'PENCIL' | 'HIGHLIGHTER';
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface Shape2DElement {
  id: string;
  type: 'SHAPE_2D';
  shape: Shape2DType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees
  color: string;
  fillColor?: string;
  strokeWidth: number;
  strokeDash?: 'SOLID' | 'DASHED' | 'DOTTED';
  label?: string;
}

export interface Shape3DElement {
  id: string;
  type: 'SHAPE_3D';
  shape: Shape3DType;
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
  rotX: number; // Pitch (-180 to 180)
  rotY: number; // Yaw (-180 to 180)
  rotZ: number; // Roll (-180 to 180)
  color: string;
  fillColor?: string;
  strokeWidth: number;
  showHiddenEdges: boolean;
  showVertexLabels: boolean;
  label?: string;
}

export interface MathElement {
  id: string;
  type: 'MATH_OBJECT';
  mathType: MathToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  data: {
    formula?: string; // e.g. "sin(x)", "x^2 - 4"
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    step?: number;
    arrowLabel?: string;
    magnitude?: number;
    angleDeg?: number;
    numSteps?: number;
    stepValue?: number;
    matrixRows?: number;
    matrixCols?: number;
    matrixValues?: string[][];
  };
}

export interface PhysicsElement {
  id: string;
  type: 'PHYSICS_OBJECT';
  physicsType: PhysicsToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  data: {
    forceName?: string; // e.g. "F_N", "mg", "T_1", "f_k"
    forceMagnitude?: string;
    angleDeg?: number; // e.g. 30 deg for inclined plane or projectile
    massValue?: string; // e.g. "m_1", "5 kg"
    springK?: string; // e.g. "k = 200 N/m"
    launchVelocity?: string; // e.g. "u = 20 m/s"
    chargeType?: 'POSITIVE' | 'NEGATIVE' | 'DIPOLE' | 'UNIFORM';
    magFieldDir?: 'OUT_OF_PAGE' | 'INTO_PAGE' | 'LEFT_TO_RIGHT';
    circuitValue?: string; // e.g. "10 Ω", "100 μF", "5 V"
    switchClosed?: boolean;
  };
}

export interface TextElement {
  id: string;
  type: 'TEXT';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
  isKaTeX?: boolean;
}

export interface ImageElement {
  id: string;
  type: 'IMAGE';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  rotation?: number; // In degrees (-180 to 180 or 0 to 360)
  fileName?: string;
  opacity?: number; // 0 to 1 (default 1)
  lockAspectRatio?: boolean;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
  aspectRatio?: number; // width / height
}

export interface MeasurementOverlayState {
  rulerVisible: boolean;
  rulerX: number;
  rulerY: number;
  rulerAngle: number;
  rulerLength: number; // in px
  protractorVisible: boolean;
  protractorX: number;
  protractorY: number;
  protractorAngle: number;
  protractorRadius: number;
}

export type WhiteboardElement =
  | FreehandStroke
  | Shape2DElement
  | Shape3DElement
  | MathElement
  | PhysicsElement
  | TextElement
  | ImageElement;

export interface WhiteboardPage {
  id: string;
  title: string;
  elements: WhiteboardElement[];
  backgroundImage?: string; // e.g. PDF rendered page or custom background template
  backgroundScale?: number;
  theme?: BoardTheme;
  undoStack: WhiteboardElement[][];
  redoStack: WhiteboardElement[][];
  createdAt: string;
}

export interface WhiteboardDocument {
  id: string;
  title: string;
  pages: WhiteboardPage[];
  activePageIndex: number;
  theme: BoardTheme;
  createdAt: string;
  updatedAt: string;
}

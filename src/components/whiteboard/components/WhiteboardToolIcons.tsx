import React from 'react';
import {
  Shape2DType,
  Shape3DType,
  MathToolType,
  PhysicsToolType,
} from '../types';

export interface ToolItem<T extends string> {
  id: T;
  label: string;
  category?: string;
  icon: React.ReactNode;
}

// ---------------------------------------------
// 2D Shape Icons
// ---------------------------------------------
export const SHAPE_2D_ITEMS: ToolItem<Shape2DType>[] = [
  {
    id: 'LINE',
    label: 'Line',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'ARROW',
    label: 'Arrow',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="4" y1="19" x2="18" y2="5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="20,4 13,5 19,11" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'DOUBLE_ARROW',
    label: 'Double Arrow',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" />
        <polygon points="20,4 14,5 19,10" fill="currentColor" />
        <polygon points="4,20 10,19 5,14" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'RECTANGLE',
    label: 'Rectangle',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="3" y="6" width="18" height="12" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'SQUARE',
    label: 'Square',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'ROUNDED_RECT',
    label: 'Rounded Box',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'CIRCLE',
    label: 'Circle',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'ELLIPSE',
    label: 'Ellipse',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <ellipse cx="12" cy="12" rx="9" ry="5.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'TRIANGLE',
    label: 'Triangle',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="12,3 3,20 21,20" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'RIGHT_TRIANGLE',
    label: 'Right △',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="4,3 4,20 20,20" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'PARALLELOGRAM',
    label: 'Parallelogram',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="8,5 21,5 16,19 3,19" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'RHOMBUS',
    label: 'Rhombus',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="12,2 21,12 12,22 3,12" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'TRAPEZIUM',
    label: 'Trapezium',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="7,5 17,5 21,19 3,19" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'HEXAGON',
    label: 'Hexagon',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'ARC',
    label: 'Circular Arc',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M4 18 A 9 9 0 0 1 20 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'SECTOR',
    label: 'Sector',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M12 20 L 5 10 A 10 10 0 0 1 19 10 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// ---------------------------------------------
// 3D Solids Icons
// ---------------------------------------------
export const SHAPE_3D_ITEMS: ToolItem<Shape3DType>[] = [
  {
    id: 'CUBE',
    label: 'Cube',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        {/* Top face */}
        <polygon points="12,2 21,7 12,12 3,7" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Left face */}
        <polygon points="3,7 12,12 12,22 3,17" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Right face */}
        <polygon points="12,12 21,7 21,17 12,22" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'CUBOID',
    label: 'Cuboid / Prism',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="10,3 22,6 15,10 3,7" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="3,7 15,10 15,21 3,18" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="15,10 22,6 22,17 15,21" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'SPHERE',
    label: 'Sphere',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    id: 'CYLINDER',
    label: 'Cylinder',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <ellipse cx="12" cy="5" rx="8" ry="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 5 v14 A 8 3 0 0 0 20 19 v-14" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="12" cy="19" rx="8" ry="3" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    id: 'CONE',
    label: 'Cone',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M12 2 L 4 18 A 8 3 0 0 0 20 18 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <ellipse cx="12" cy="18" rx="8" ry="3" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    id: 'PRISM',
    label: 'Triangular Prism',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="7,4 2,19 12,19" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="7,4 12,19 22,14 17,2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'PYRAMID',
    label: 'Square Pyramid',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="12,2 3,18 13,21" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="12,2 13,21 21,17" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'TETRAHEDRON',
    label: 'Tetrahedron',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="12,3 3,20 14,18" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="12,3 14,18 21,16" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'HEMISPHERE',
    label: 'Hemisphere',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M3 14 A 9 9 0 0 1 21 14 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="12" cy="14" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
];

// ---------------------------------------------
// Math Tools Icons
// ---------------------------------------------
export const MATH_TOOL_ITEMS: ToolItem<MathToolType>[] = [
  {
    id: 'COORDINATE_PLANE',
    label: 'XY Axes Plane',
    category: 'Geometry & Graphs',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.8" />
        <polygon points="21,12 17,9.5 17,14.5" fill="currentColor" />
        <line x1="12" y1="21" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" />
        <polygon points="12,3 9.5,7 14.5,7" fill="currentColor" />
        <line x1="7" y1="10.5" x2="7" y2="13.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="17" y1="10.5" x2="17" y2="13.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10.5" y1="7" x2="13.5" y2="7" stroke="currentColor" strokeWidth="1.2" />
        <line x1="10.5" y1="17" x2="13.5" y2="17" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'TRIG_CIRCLE',
    label: 'Unit Trig Circle',
    category: 'Trigonometry',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
        <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" />
        <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" />
        <line x1="12" y1="12" x2="18" y2="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14.5 12 A 2.5 2.5 0 0 0 14 10" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'VECTOR_ARROW',
    label: 'Vector Components',
    category: 'Vectors & Calculus',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="4" y1="20" x2="18" y2="6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="20,4 14,5.5 18.5,10" fill="currentColor" />
        <line x1="4" y1="20" x2="18" y2="20" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
        <line x1="18" y1="20" x2="18" y2="6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    id: 'NUMBER_LINE',
    label: 'Number Line',
    category: 'Real Numbers',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
        <polygon points="22,12 18,9.5 18,14.5" fill="currentColor" />
        <polygon points="2,12 6,9.5 6,14.5" fill="currentColor" />
        <line x1="7" y1="8" x2="7" y2="16" stroke="currentColor" strokeWidth="1.5" />
        <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2" />
        <line x1="17" y1="8" x2="17" y2="16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'MATRIX_GRID',
    label: 'Matrix Grid',
    category: 'Algebra & Matrices',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M6 4 H4 V20 H6" stroke="currentColor" strokeWidth="1.8" />
        <path d="M18 4 H20 V20 H18" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
        <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
        <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'FUNCTION_GRAPH',
    label: 'Function Graph',
    category: 'Calculus Curves',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" />
        <line x1="4" y1="21" x2="4" y2="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 15 Q 9 2 13 14 T 21 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ---------------------------------------------
// Physics Tools Icons
// ---------------------------------------------
export const PHYSICS_TOOL_ITEMS: ToolItem<PhysicsToolType>[] = [
  {
    id: 'FBD_VECTOR',
    label: 'FBD Force Body',
    category: 'Mechanics',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="12" y1="8" x2="12" y2="2" stroke="currentColor" strokeWidth="1.6" />
        <polygon points="12,2 10,4.5 14,4.5" fill="currentColor" />
        <line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" />
        <polygon points="12,22 10,19.5 14,19.5" fill="currentColor" />
        <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.6" />
        <polygon points="22,12 19.5,10 19.5,14" fill="currentColor" />
        <line x1="8" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="1.6" />
        <polygon points="2,12 4.5,10 4.5,14" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'BLOCK_MASS',
    label: 'Mass on Surface',
    category: 'Mechanics',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="6" y="8" width="12" height="9" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.6" />
        <text x="12" y="14" fontSize="6" fontWeight="bold" textAnchor="middle" fill="currentColor">m</text>
        <line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="1.8" />
        <line x1="4" y1="17" x2="2" y2="20" stroke="currentColor" strokeWidth="1" />
        <line x1="9" y1="17" x2="7" y2="20" stroke="currentColor" strokeWidth="1" />
        <line x1="14" y1="17" x2="12" y2="20" stroke="currentColor" strokeWidth="1" />
        <line x1="19" y1="17" x2="17" y2="20" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'INCLINED_PLANE',
    label: 'Inclined Plane θ',
    category: 'Mechanics',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="3,20 21,20 3,6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="9" y="8" width="6" height="4" transform="rotate(-38 9 8)" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.2" />
        <path d="M17 20 A 4 4 0 0 1 15 17.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'PULLEY_SYSTEM',
    label: 'Pulley (Atwood)',
    category: 'Mechanics',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="12" cy="7" r="4" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="7" r="1" fill="currentColor" />
        <line x1="8" y1="7" x2="8" y2="17" stroke="currentColor" strokeWidth="1.4" />
        <rect x="6" y="17" width="4" height="4" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1" />
        <line x1="16" y1="7" x2="16" y2="14" stroke="currentColor" strokeWidth="1.4" />
        <rect x="14" y="14" width="4" height="5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'SPRING_MASS',
    label: 'Spring Mass (k)',
    category: 'Mechanics',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="2" y1="4" x2="2" y2="20" stroke="currentColor" strokeWidth="2" />
        <path d="M2 12 H5 L6.5 9 L9.5 15 L12.5 9 L15.5 15 L17 12 H18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="18" y="8" width="5" height="8" rx="1" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: 'PROJECTILE_MOTION',
    label: 'Projectile Motion',
    category: 'Mechanics',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 20 Q 12 4 21 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2 2" />
        <circle cx="3" cy="20" r="1.5" fill="currentColor" />
        <line x1="3" y1="20" x2="8" y2="13" stroke="currentColor" strokeWidth="1.6" />
        <polygon points="9,12 6,14 8,16" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'ELECTRIC_FIELD',
    label: 'Electric Dipole',
    category: 'Electromagnetism',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="6" cy="12" r="3" fill="#f87171" stroke="currentColor" strokeWidth="1.2" />
        <text x="6" y="14" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#ffffff">+</text>
        <circle cx="18" cy="12" r="3" fill="#38bdf8" stroke="currentColor" strokeWidth="1.2" />
        <text x="18" y="13.5" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#ffffff">-</text>
        <path d="M9 12 H15" stroke="currentColor" strokeWidth="1.4" />
        <polygon points="13,10.5 15,12 13,13.5" fill="currentColor" />
        <path d="M8 9 Q 12 6 16 9" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 15 Q 12 18 16 15" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'MAGNETIC_FIELD',
    label: 'Magnetic Field B⃗',
    category: 'Electromagnetism',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="7" cy="7" r="1" fill="currentColor" />
        <circle cx="17" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="14.5" y1="4.5" x2="19.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="19.5" y1="4.5" x2="14.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="7" cy="17" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="4.5" y1="14.5" x2="9.5" y2="19.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="9.5" y1="14.5" x2="4.5" y2="19.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="17" cy="17" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="17" cy="17" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'CIRCUIT_RESISTOR',
    label: 'Resistor (R)',
    category: 'Circuits',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M2 12 H6 L8 7 L11 17 L14 7 L17 17 L19 12 H22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'CIRCUIT_CAPACITOR',
    label: 'Capacitor (C)',
    category: 'Circuits',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="2" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.8" />
        <line x1="10" y1="5" x2="10" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="14" y1="5" x2="14" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="14" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'CIRCUIT_INDUCTOR',
    label: 'Inductor (L)',
    category: 'Circuits',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M2 14 H5 C5 9 8 9 8 14 C8 9 11 9 11 14 C11 9 14 9 14 14 C14 9 17 9 17 14 C17 9 20 9 20 14 H22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'CIRCUIT_BATTERY',
    label: 'DC Battery',
    category: 'Circuits',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <line x1="2" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.8" />
        <line x1="9" y1="5" x2="9" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="15" y1="8" x2="15" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="15" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'CIRCUIT_AC_SOURCE',
    label: 'AC Source (~)',
    category: 'Circuits',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 12 Q 10.5 8 12 12 T 15 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="1.8" />
        <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'CIRCUIT_SWITCH',
    label: 'Switch',
    category: 'Circuits',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="6" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
        <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.8" />
        <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" />
        <line x1="7.5" y1="10.5" x2="16" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

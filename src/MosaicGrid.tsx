/**
 * MosaicGrid.tsx
 * 
 * A responsive, animated mosaic grid component that creates procedurally generated
 * tile patterns with fixed content tiles for navigation and information display.
 * 
 * Features:
 * - Responsive grid that adapts to viewport size
 * - Weighted random tile generation for organic layouts
 * - Fixed tiles with fallback positioning for different screen sizes
 * - Smooth animations with staggered delays
 * - Multi-page navigation system
 * - Support for external links
 */

import React, { useEffect, useState, useCallback } from 'react';
import './MosaicGrid.css';

// Type definitions
type PageType = 'home' | 'about' | 'projects';

interface TileType {
  width: number;
  height: number;
  weight: number; // Probability weight for random tile generation
}

interface Tile {
  row: number;
  col: number;
  width: number;
  height: number;
  id: string;
  color: number;
  text?: string;
  url?: string;
  fontSize?: number;
}

interface FixedTile {
  row: number;
  col: number;
  width: number;
  height: number;
  color: number;
  text?: string;
  url?: string;
  // Alternative positioning for responsive layouts
  altRow?: number;
  altCol?: number;
  altWidth?: number;
  altHeight?: number;
  fontSize?: number;
}

// Configuration constants
const GRID_CONFIG = {
  TILE_SIZE: 60, // Size of each grid cell in pixels
  MAX_PLACEMENT_ATTEMPTS: 1000, // Maximum attempts to place random tiles
  ANIMATION_DELAY_MULTIPLIER: 2, // Milliseconds delay multiplier for animations
  ANIMATION_BASE_DELAY: 100, // Base delay for text animations
} as const;

// Weighted tile types for procedural generation
// Higher weights = more likely to appear
const TILE_TYPES: TileType[] = [
  { width: 1, height: 1, weight: 0.3 },   // Small squares (most common)
  { width: 2, height: 1, weight: 0.2 },   // Horizontal rectangles
  { width: 1, height: 2, weight: 0.2 },   // Vertical rectangles
  { width: 2, height: 2, weight: 0.1 },   // Medium squares
  { width: 1, height: 3, weight: 0.08 },  // Tall rectangles
  { width: 3, height: 1, weight: 0.08 },  // Wide rectangles
  { width: 2, height: 3, weight: 0.02 },  // Large verticals (rare)
  { width: 3, height: 2, weight: 0.02 }   // Large horizontals (rare)
];

// Static tiles that appear on all pages
const STATIC_TILES: FixedTile[] = [
  {
    row: 1,
    col: 1,
    width: 4,
    height: 1,
    color: 9,
    text: "Charlie Beutter",
    altRow: 1,
    altCol: 1,
    fontSize: 1.6
  },
];

// Page-specific tiles configuration
const PAGE_SPECIFIC_TILES: Record<PageType, FixedTile[]> = {
  home: [
    {
      row: 1,
      col: 6,
      width: 2,
      height: 1,
      color: 10,
      text: "About",
      altRow: 3,
      altCol: 1,
      fontSize: 1.3
    },
    {
      row: 1,
      col: 9,
      width: 2,
      height: 1,
      color: 10,
      text: "Projects",
      altRow: 5,
      altCol: 1,
      fontSize: 1.3
    },
  ],
  about: [
    {
      row: 1,
      col: 6,
      width: 5,
      height: 1,
      altRow: 3,
      altCol: 1,
      color: 10,
      text: "Hey! I'm Charlie. I code stuff.",
      fontSize: 1.1,
    },
    {
      row: 1,
      col: 12,
      width: 2,
      height: 1,
      altRow: 5,
      altCol: 1,
      color: 10,
      text: "My Github",
      url: "https://www.github.com/charliebutter",
      fontSize: 1.1,
    },
  ],
  projects: [
    {
      row: 1,
      col: 6,
      width: 5,
      height: 1,
      altRow: 3,
      altCol: 1,
      color: 10,
      text: "Fantasy Name Generator",
      url: "https://fantasy-names.charliebeutter.com/",
      fontSize: 1.2,
    },
    {
      row: 1,
      col: 12,
      width: 2,
      height: 1,
      altRow: 5,
      altCol: 1,
      color: 10,
      text: "Circuits",
      url: "https://circuits.charliebeutter.com",
      fontSize: 1.2,
    },
  ],
};

/**
 * MosaicGenerator creates a procedural mosaic pattern with fixed and random tiles
 * Uses a grid-based approach to track tile placement and avoid overlaps
 */
class MosaicGenerator {
  private grid: boolean[][]; // Tracks occupied grid cells (true = occupied)
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  private readonly fixedTiles: FixedTile[];

  constructor(gridWidth: number, gridHeight: number, fixedTiles: FixedTile[] = []) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.fixedTiles = fixedTiles;
    this.grid = [];
    this.resetGrid();
  }

  /**
   * Converts negative coordinates to positive by counting from the end
   * Example: -1 with dimension 10 becomes 9
   */
  private normalizeCoordinate(coordinate: number, dimension: number): number {
    return coordinate < 0 ? dimension + coordinate : coordinate;
  }

  /**
   * Initializes the grid with all cells marked as unoccupied
   */
  private resetGrid(): void {
    this.grid = Array(this.gridHeight)
      .fill(null)
      .map(() => Array(this.gridWidth).fill(false));
  }

  /**
   * Checks if a tile can be placed at the specified position without overlapping
   */
  private canPlaceTile(row: number, col: number, width: number, height: number): boolean {
    // Check bounds
    if (row + height > this.gridHeight || col + width > this.gridWidth) {
      return false;
    }

    // Check for overlaps with existing tiles
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        if (this.grid[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Marks grid cells as occupied for the placed tile
   */
  private placeTile(row: number, col: number, width: number, height: number): void {
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        this.grid[r][c] = true;
      }
    }
  }

  /**
   * Selects a random tile type based on weighted probabilities
   * Uses cumulative distribution for selection
   */
  private getRandomTileType(): TileType {
    const rand = Math.random();
    let cumulative = 0;

    for (const tileType of TILE_TYPES) {
      cumulative += tileType.weight;
      if (rand < cumulative) {
        return tileType;
      }
    }
    // Fallback to first tile type (should never happen with proper weights)
    return TILE_TYPES[0];
  }

  /**
   * Generates the complete mosaic pattern with fixed and random tiles
   * Uses a responsive approach that falls back to alternative positions when needed
   */
  generatePattern(): Tile[] {
    this.resetGrid();
    const tiles: Tile[] = [];

    // Determine placement strategy for fixed tiles
    const placementStrategy = this.determinePlacementStrategy();
    
    // Place fixed tiles based on strategy
    this.placeFixedTiles(tiles, placementStrategy);
    
    // Fill remaining space with random tiles
    this.placeRandomTiles(tiles);
    
    // Fill any remaining empty cells with single tiles
    this.fillEmptyCells(tiles);

    return tiles;
  }

  /**
   * Determines the best placement strategy for fixed tiles
   * Returns 'primary' if all tiles fit at primary positions, 
   * 'alternative' if they fit at alternative positions, or 'fallback'
   */
  private determinePlacementStrategy(): 'primary' | 'alternative' | 'fallback' {
    // Check if all fixed tiles can be placed at their primary coordinates
    const canPlacePrimary = this.fixedTiles.every(tile => {
      const { row, col, width, height } = this.getNormalizedTilePosition(tile, false);
      return this.isValidPlacement(row, col, width, height);
    });

    if (canPlacePrimary) return 'primary';

    // Check if all fixed tiles can be placed at their alternative coordinates
    const canPlaceAlternative = this.fixedTiles.every(tile => {
      if (tile.altRow === undefined || tile.altCol === undefined) {
        // No alternative - check primary again
        const { row, col, width, height } = this.getNormalizedTilePosition(tile, false);
        return this.isValidPlacement(row, col, width, height);
      }
      
      const { row, col, width, height } = this.getNormalizedTilePosition(tile, true);
      return this.isValidPlacement(row, col, width, height);
    });

    return canPlaceAlternative ? 'alternative' : 'fallback';
  }

  /**
   * Gets normalized position and dimensions for a tile
   */
  private getNormalizedTilePosition(tile: FixedTile, useAlternative: boolean) {
    if (useAlternative && tile.altRow !== undefined && tile.altCol !== undefined) {
      return {
        row: this.normalizeCoordinate(tile.altRow, this.gridHeight - 1),
        col: this.normalizeCoordinate(tile.altCol, this.gridWidth - 1),
        width: tile.altWidth ?? tile.width,
        height: tile.altHeight ?? tile.height
      };
    }
    
    return {
      row: this.normalizeCoordinate(tile.row, this.gridHeight - 1),
      col: this.normalizeCoordinate(tile.col, this.gridWidth - 1),
      width: tile.width,
      height: tile.height
    };
  }

  /**
   * Checks if a tile placement is valid (within bounds and no overlaps)
   */
  private isValidPlacement(row: number, col: number, width: number, height: number): boolean {
    return col + width <= this.gridWidth - 1 &&
           row + height <= this.gridHeight - 1 &&
           this.canPlaceTile(row, col, width, height);
  }

  /**
   * Places fixed tiles according to the determined strategy
   */
  private placeFixedTiles(tiles: Tile[], strategy: 'primary' | 'alternative' | 'fallback'): void {
    if (strategy === 'fallback') {
      // Only place essential tiles (like "Charlie Beutter")
      this.placeEssentialTiles(tiles);
      return;
    }

    const useAlternative = strategy === 'alternative';
    
    for (const fixedTile of this.fixedTiles) {
      const { row, col, width, height } = this.getNormalizedTilePosition(fixedTile, useAlternative);
      
      if (this.isValidPlacement(row, col, width, height)) {
        this.placeTile(row, col, width, height);
        tiles.push(this.createTileFromFixed(fixedTile, row, col, width, height));
      }
    }
  }

  /**
   * Places only essential tiles when full placement fails
   */
  private placeEssentialTiles(tiles: Tile[]): void {
    const charlieTile = this.fixedTiles.find(tile => tile.text === "Charlie Beutter");
    if (!charlieTile) return;

    const { row, col, width, height } = this.getNormalizedTilePosition(charlieTile, false);
    
    if (this.isValidPlacement(row, col, width, height)) {
      this.placeTile(row, col, width, height);
      tiles.push(this.createTileFromFixed(charlieTile, row, col, width, height));
    }
  }

  /**
   * Creates a Tile object from a FixedTile with calculated position
   */
  private createTileFromFixed(fixedTile: FixedTile, row: number, col: number, width: number, height: number): Tile {
    return {
      row,
      col,
      width,
      height,
      id: `fixed-${row}-${col}-${Date.now()}-${Math.random()}`,
      color: fixedTile.color,
      text: fixedTile.text,
      url: fixedTile.url,
      fontSize: fixedTile.fontSize
    };
  }

  /**
   * Places random tiles in remaining available space
   */
  private placeRandomTiles(tiles: Tile[]): void {
    for (let attempts = 0; attempts < GRID_CONFIG.MAX_PLACEMENT_ATTEMPTS; attempts++) {
      const tileType = this.getRandomTileType();
      const row = Math.floor(Math.random() * this.gridHeight);
      const col = Math.floor(Math.random() * this.gridWidth);

      if (this.canPlaceTile(row, col, tileType.width, tileType.height)) {
        this.placeTile(row, col, tileType.width, tileType.height);
        tiles.push({
          row,
          col,
          width: tileType.width,
          height: tileType.height,
          id: `random-${row}-${col}-${Date.now()}-${Math.random()}`,
          color: Math.floor(Math.random() * 8) + 1
        });
      }
    }
  }

  /**
   * Fills any remaining empty cells with single unit tiles
   */
  private fillEmptyCells(tiles: Tile[]): void {
    for (let row = 0; row < this.gridHeight; row++) {
      for (let col = 0; col < this.gridWidth; col++) {
        if (!this.grid[row][col]) {
          tiles.push({
            row,
            col,
            width: 1,
            height: 1,
            id: `fill-${row}-${col}-${Date.now()}-${Math.random()}`,
            color: Math.floor(Math.random() * 8) + 1
          });
          this.grid[row][col] = true;
        }
      }
    }
  }
}

// Helper functions for tile rendering and interactions
const isClickableTile = (tile: Tile): boolean => {
  return Boolean(tile.url || ['About', 'Projects', 'Charlie Beutter'].includes(tile.text || ''));
};

const getAnimationDelay = (index: number, shouldAnimate: boolean): string => {
  return shouldAnimate ? `${index * GRID_CONFIG.ANIMATION_DELAY_MULTIPLIER}ms` : '0ms';
};

const getTextAnimationDelay = (index: number, shouldAnimate: boolean): string => {
  return shouldAnimate 
    ? `${index * GRID_CONFIG.ANIMATION_DELAY_MULTIPLIER + GRID_CONFIG.ANIMATION_BASE_DELAY}ms` 
    : '0ms';
};

/**
 * Main MosaicGrid component that creates an animated tile-based layout
 * Supports multiple pages with responsive tile positioning
 */
const MosaicGrid: React.FC = () => {
  // State management
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [gridDimensions, setGridDimensions] = useState({ width: 20, height: 15 });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  /**
   * Calculates grid dimensions based on viewport size
   * Adds +1 to ensure full coverage of the viewport
   */
  const calculateGridDimensions = useCallback(() => {
    const width = Math.floor(window.innerWidth / GRID_CONFIG.TILE_SIZE) + 1;
    const height = Math.floor(window.innerHeight / GRID_CONFIG.TILE_SIZE) + 1;
    setGridDimensions({ width, height });
  }, []);

  /**
   * Generates a new mosaic pattern with current page tiles
   */
  const generateMosaic = useCallback((isRegeneration = false) => {
    const currentPageTiles = PAGE_SPECIFIC_TILES[currentPage] || [];
    const allFixedTiles = [...STATIC_TILES, ...currentPageTiles];
    const generator = new MosaicGenerator(gridDimensions.width, gridDimensions.height, allFixedTiles);
    const newTiles = generator.generatePattern();
    setTiles(newTiles);
    
    if (isRegeneration) {
      setIsInitialLoad(false);
    }
  }, [gridDimensions, currentPage]);

  /**
   * Handles tile click interactions for navigation and external links
   */
  const handleTileClick = useCallback((tile: Tile) => {
    const { text, url } = tile;
    
    // Navigation tiles
    if (text === 'About') {
      setCurrentPage('about');
      generateMosaic(true);
    } else if (text === 'Projects') {
      setCurrentPage('projects');  
      generateMosaic(true);
    } else if (text === 'Charlie Beutter') {
      setCurrentPage('home');
      generateMosaic(true);
    } 
    // External links
    else if (url) {
      window.open(url, '_blank');
    }
  }, [generateMosaic]);

  // Set up responsive grid dimensions
  useEffect(() => {
    calculateGridDimensions();

    const handleResize = () => {
      calculateGridDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateGridDimensions]);

  // Generate mosaic when dependencies change
  useEffect(() => {
    generateMosaic();
  }, [generateMosaic]);

  return (
    <div className={`mosaic-container ${currentPage}`}>
      <div
        className="mosaic-grid"
        style={{
          gridTemplateColumns: `repeat(${gridDimensions.width}, ${GRID_CONFIG.TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${gridDimensions.height}, ${GRID_CONFIG.TILE_SIZE}px)`
        }}
      >
        {tiles.map((tile, index) => 
          renderTile(tile, index, isInitialLoad, handleTileClick)
        )}
      </div>
    </div>
  );
};

/**
 * Renders an individual tile with proper styling and interactions
 */
const renderTile = (tile: Tile, index: number, isInitialLoad: boolean, onTileClick: (tile: Tile) => void) => {
  const isStaticTile = tile.text && STATIC_TILES.some(staticTile => staticTile.text === tile.text);
  const shouldAnimate = isInitialLoad || !isStaticTile;
  const clickable = isClickableTile(tile);

  return (
    <div
      key={tile.id}
      className={getTileClasses(tile, shouldAnimate)}
      style={getTileStyles(tile, index, shouldAnimate)}
      onClick={clickable ? () => onTileClick(tile) : undefined}
    >
      {tile.text && renderTileText(tile, index, shouldAnimate)}
    </div>
  );
};

/**
 * Renders the text content of a tile
 */
const renderTileText = (tile: Tile, index: number, shouldAnimate: boolean) => (
  <div
    className="tile-text"
    style={{
      animationDelay: getTextAnimationDelay(index, shouldAnimate),
      fontSize: tile.fontSize ? `${tile.fontSize}em` : undefined
    }}
  >
    {tile.text}
  </div>
);

/**
 * Generates CSS classes for a tile
 */
const getTileClasses = (tile: Tile, shouldAnimate: boolean): string => {
  const classes = [`tile`, `color-${tile.color}`];
  
  if (isClickableTile(tile)) classes.push('clickable');
  if (tile.url) classes.push('has-url');
  if (!shouldAnimate) classes.push('no-animation');
  
  return classes.join(' ');
};

/**
 * Generates inline styles for a tile
 */
const getTileStyles = (tile: Tile, index: number, shouldAnimate: boolean) => ({
  gridColumn: `${tile.col + 1} / span ${tile.width}`,
  gridRow: `${tile.row + 1} / span ${tile.height}`,
  animationDelay: getAnimationDelay(index, shouldAnimate)
});

export default MosaicGrid;
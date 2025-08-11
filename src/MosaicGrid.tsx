import React, { useEffect, useState, useCallback } from 'react';
import './MosaicGrid.css';

interface TileType {
  width: number;
  height: number;
  weight: number;
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
  altRow?: number;
  altCol?: number;
  fontSize?: number;
}

const TILE_TYPES: TileType[] = [
  { width: 1, height: 1, weight: 0.3 },
  { width: 2, height: 1, weight: 0.2 },
  { width: 1, height: 2, weight: 0.2 },
  { width: 2, height: 2, weight: 0.1 },
  { width: 1, height: 3, weight: 0.08 },
  { width: 3, height: 1, weight: 0.08 },
  { width: 2, height: 3, weight: 0.02 },
  { width: 3, height: 2, weight: 0.02 }
];

const FIXED_TILES: FixedTile[] = [
  { 
    row: 1, 
    col: 1, 
    width: 4, 
    height: 1, 
    color: 9,
    text: "Charlie Beutter",
    altRow: 3,
    altCol: 1,
    fontSize: 1.6
  },
  { 
    row: 1, 
    col: 6, 
    width: 2, 
    height: 1, 
    color: 10,
    text: "Github",
    url: "https://github.com/charliebutter",
    altRow: 3,
    altCol: 1,
    fontSize: 1.3
  },
  { 
    row: 1, 
    col: 9, 
    width: 5, 
    height: 1, 
    color: 10,
    text: "Fantasy Name Generator",
    url: "https://fantasy-names.charliebeutter.com",
    fontSize: 1.3
  },
  { 
    row: 1, 
    col: 15, 
    width: 2, 
    height: 1, 
    color: 10,
    text: "Circuits",
    url: "https://circuits.charliebeutter.com",
    fontSize: 1.3
  },
  { 
    row: -1, 
    col: 1, 
    width: 1, 
    height: 1, 
    color: 10,
    text: `v1.2`,
    fontSize: 1.0
  },
];

class MosaicGenerator {
  private grid: boolean[][];
  private gridWidth: number;
  private gridHeight: number;
  private fixedTiles: FixedTile[];

  constructor(gridWidth: number, gridHeight: number, fixedTiles: FixedTile[] = []) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.fixedTiles = fixedTiles;
    this.grid = [];
    this.resetGrid();
  }

  private normalizeCoordinate(coordinate: number, dimension: number): number {
    if (coordinate < 0) {
      return dimension + coordinate;
    }
    return coordinate;
  }

  resetGrid() {
    this.grid = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(false));
  }

  canPlaceTile(row: number, col: number, width: number, height: number): boolean {
    if (row + height > this.gridHeight || col + width > this.gridWidth) {
      return false;
    }

    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        if (this.grid[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  placeTile(row: number, col: number, width: number, height: number) {
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        this.grid[r][c] = true;
      }
    }
  }

  getRandomTileType(): TileType {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const tileType of TILE_TYPES) {
      cumulative += tileType.weight;
      if (rand < cumulative) {
        return tileType;
      }
    }
    return TILE_TYPES[0];
  }

  generatePattern(): Tile[] {
    this.resetGrid();
    const tiles: Tile[] = [];

    // Place fixed tiles first, trying primary coordinates first, then alternate coordinates
    for (const fixedTile of this.fixedTiles) {
      let placed = false;
      
      // Try primary coordinates first
      const normalizedRow = this.normalizeCoordinate(fixedTile.row, this.gridHeight - 1);
      const normalizedCol = this.normalizeCoordinate(fixedTile.col, this.gridWidth - 1);
      
      if (normalizedCol + fixedTile.width <= this.gridWidth - 1 && 
          normalizedRow + fixedTile.height <= this.gridHeight - 1 &&
          this.canPlaceTile(normalizedRow, normalizedCol, fixedTile.width, fixedTile.height)) {
        this.placeTile(normalizedRow, normalizedCol, fixedTile.width, fixedTile.height);
        tiles.push({
          row: normalizedRow,
          col: normalizedCol,
          width: fixedTile.width,
          height: fixedTile.height,
          id: `fixed-${normalizedRow}-${normalizedCol}-${Date.now()}-${Math.random()}`,
          color: fixedTile.color,
          text: fixedTile.text,
          url: fixedTile.url,
          fontSize: fixedTile.fontSize
        });
        placed = true;
      }
      
      // If primary coordinates failed and alternate coordinates exist, try alternate coordinates
      if (!placed && fixedTile.altRow !== undefined && fixedTile.altCol !== undefined) {
        const normalizedAltRow = this.normalizeCoordinate(fixedTile.altRow, this.gridHeight - 1);
        const normalizedAltCol = this.normalizeCoordinate(fixedTile.altCol, this.gridWidth - 1);
        
        if (normalizedAltCol + fixedTile.width <= this.gridWidth - 1 && 
            normalizedAltRow + fixedTile.height <= this.gridHeight - 1 &&
            this.canPlaceTile(normalizedAltRow, normalizedAltCol, fixedTile.width, fixedTile.height)) {
          this.placeTile(normalizedAltRow, normalizedAltCol, fixedTile.width, fixedTile.height);
          tiles.push({
            row: normalizedAltRow,
            col: normalizedAltCol,
            width: fixedTile.width,
            height: fixedTile.height,
            id: `fixed-${normalizedAltRow}-${normalizedAltCol}-${Date.now()}-${Math.random()}`,
            color: fixedTile.color,
            text: fixedTile.text,
            url: fixedTile.url,
            fontSize: fixedTile.fontSize
          });
        }
      }
    }

    for (let attempts = 0; attempts < 1000; attempts++) {
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
          id: `${row}-${col}-${Date.now()}-${Math.random()}`,
          color: Math.floor(Math.random() * 8) + 1
        });
      }
    }

    for (let row = 0; row < this.gridHeight; row++) {
      for (let col = 0; col < this.gridWidth; col++) {
        if (!this.grid[row][col]) {
          tiles.push({
            row,
            col,
            width: 1,
            height: 1,
            id: `${row}-${col}-${Date.now()}-${Math.random()}`,
            color: Math.floor(Math.random() * 8) + 1
          });
          this.grid[row][col] = true;
        }
      }
    }

    return tiles;
  }
}

const MosaicGrid: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [gridDimensions, setGridDimensions] = useState({ width: 20, height: 15 });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const calculateGridDimensions = useCallback(() => {
    const tileSize = 60;
    const width = Math.floor(window.innerWidth / tileSize) + 1;
    const height = Math.floor(window.innerHeight / tileSize) + 1;
    setGridDimensions({ width, height });
  }, []);

  const generateMosaic = useCallback((isRegeneration = false) => {
    const generator = new MosaicGenerator(gridDimensions.width, gridDimensions.height, FIXED_TILES);
    const newTiles = generator.generatePattern();
    setTiles(newTiles);
    if (isRegeneration) {
      setIsInitialLoad(false);
    }
  }, [gridDimensions]);

  useEffect(() => {
    calculateGridDimensions();
    
    const handleResize = () => {
      calculateGridDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateGridDimensions]);

  useEffect(() => {
    generateMosaic();
  }, [generateMosaic]);

  return (
    <div className="mosaic-container">
      <div 
        className="mosaic-grid"
        style={{
          gridTemplateColumns: `repeat(${gridDimensions.width}, 60px)`,
          gridTemplateRows: `repeat(${gridDimensions.height}, 60px)`
        }}
      >
        {tiles.map((tile, index) => {
          const isFixedTile = tile.text !== undefined;
          const shouldAnimate = isInitialLoad || !isFixedTile;
          
          const tileContent = (
            <>
              {tile.text && (
                <div 
                  className="tile-text"
                  style={{
                    animationDelay: shouldAnimate ? `${index * 2 + 100}ms` : '0ms',
                    fontSize: tile.fontSize ? `${tile.fontSize}em` : undefined
                  }}
                >
                  {tile.text}
                </div>
              )}
            </>
          );

          const handleTileClick = () => {
            if (tile.text === "Charlie Beutter") {
              generateMosaic(true);
            } else if (tile.url) {
              window.open(tile.url, '_blank');
            }
          };

          const tileElement = (
            <div
              key={tile.id}
              className={`tile color-${tile.color} ${tile.url || tile.text === "Charlie Beutter" ? 'clickable' : ''} ${shouldAnimate ? '' : 'no-animation'}`}
              style={{
                gridColumn: `${tile.col + 1} / span ${tile.width}`,
                gridRow: `${tile.row + 1} / span ${tile.height}`,
                animationDelay: shouldAnimate ? `${index * 2}ms` : '0ms'
              }}
              onClick={tile.url || tile.text === "Charlie Beutter" ? handleTileClick : undefined}
            >
              {tileContent}
            </div>
          );

          return tileElement;
        })}
      </div>
    </div>
  );
};

export default MosaicGrid;
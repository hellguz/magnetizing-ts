declare module 'clipper-lib' {
  export interface IntPoint {
    X: number;
    Y: number;
  }

  export enum PolyType {
    ptSubject = 0,
    ptClip = 1,
  }

  export enum ClipType {
    ctIntersection = 0,
    ctUnion = 1,
    ctDifference = 2,
    ctXor = 3,
  }

  export enum PolyFillType {
    pftEvenOdd = 0,
    pftNonZero = 1,
    pftPositive = 2,
    pftNegative = 3,
  }

  export class Clipper {
    AddPath(path: IntPoint[], polyType: PolyType, closed: boolean): boolean;
    Execute(
      clipType: ClipType,
      solution: IntPoint[][],
      subjFillType: PolyFillType,
      clipFillType: PolyFillType
    ): boolean;
    static Area(path: IntPoint[]): number;
  }
}

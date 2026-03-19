// Placeholder type definitions for d3-dispatch to fix build errors
declare module 'd3-dispatch' {
  export function dispatch<T extends string>(...types: T[]): Dispatch<T>;
  
  export interface Dispatch<T extends string> {
    on(typenames: T): (event: any) => void;
    on(typenames: T, callback: (event: any) => void): this;
    copy(): Dispatch<T>;
    call(type: T, that?: any, ...args: any[]): void;
    apply(type: T, that?: any, args?: any[]): void;
  }
}

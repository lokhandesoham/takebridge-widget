// src/types/novnc.d.ts
declare module '@novnc/novnc/lib/rfb' {
    export default class RFB {
      constructor(target: HTMLElement, url: string, options?: any);
  
      disconnect(): void;
      sendCtrlAltDel(): void;
  
      viewOnly: boolean;
      scaleViewport: boolean;
      background: string;
  
      addEventListener(
        name: 'connect' | 'disconnect' | 'credentialsrequired' | string,
        handler: (ev: any) => void
      ): void;
    }
  }
  
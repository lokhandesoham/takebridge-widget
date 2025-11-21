// src/components/VncViewer.tsx
import React, { useEffect, useRef } from "react";

export interface VncViewerProps {
  url: string;
  password?: string;
  viewOnly?: boolean;
  visible?: boolean;
  className?: string;
  hideCursor?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (err: unknown) => void;
}

export const VncViewer: React.FC<VncViewerProps> = ({
  url,
  password,
  viewOnly = false,
  visible = true,
  className,
  hideCursor,
  onConnect,
  onDisconnect,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rfbRef = useRef<any | null>(null);

  useEffect(() => {
    if (!visible || !url || !containerRef.current) return;

    let isCancelled = false;

    // Load RFB dynamically - Vite will handle the CommonJS conversion
    const loadRFB = async (): Promise<any> => {
      try {
        console.log('[VNC] Loading RFB module via dynamic import...');
        // Use dynamic import - Vite handles CommonJS to ESM conversion
        const module = await import('@novnc/novnc/lib/rfb');
        const RFB = module.default || (module as any).RFB || module;
        
        if (!RFB || typeof RFB !== 'function') {
          throw new Error('RFB class not found in module. Got: ' + typeof RFB);
        }
        
        console.log('[VNC] RFB loaded successfully:', typeof RFB);
        return RFB;
      } catch (err) {
        console.error('[VNC] Failed to import RFB:', err);
        throw err;
      }
    };

    loadRFB()
      .then((RFB) => {
        if (isCancelled) return;

        try {
          const target = containerRef.current;
          if (!target) return;

          // Create RFB without credentials; we'll send them via credentialsrequired.
          const rfb = new RFB(target, url, {
            focusOnClick: true,  // Capture keyboard on click
          });

          // Make sure it's interactive
          rfb.viewOnly = !!viewOnly;  // false => can click/type
          rfb.scaleViewport = true;
          rfb.resizeSession = true;
          (rfb as any).background = "black";

          const handleConnect = () => {
            if (isCancelled) return;
            console.log("[VNC] connected (viewOnly =", rfb.viewOnly, ")");
            onConnect?.();
          };

          const handleDisconnect = (ev: any) => {
            if (isCancelled) return;
            const reason = ev?.detail?.clean === false ? "unclean" : "normal";
            console.warn("[VNC] disconnected:", reason);
            onDisconnect?.(reason);
          };

          const handleCredentialsRequired = () => {
            console.log("[VNC] credentials required");
            if (password) {
              try {
                (rfb as any).sendCredentials({ password });
                console.log("[VNC] credentials sent");
              } catch (e) {
                console.error("[VNC] error sending credentials:", e);
                onError?.(e);
              }
            } else {
              const err = new Error(
                "VNC password required but not provided in widget"
              );
              console.error("[VNC] " + err.message);
              onError?.(err);
            }
          };

          rfb.addEventListener("connect", handleConnect);
          rfb.addEventListener("disconnect", handleDisconnect);
          rfb.addEventListener("credentialsrequired", handleCredentialsRequired);

          rfbRef.current = rfb;
        } catch (err) {
          console.error("[VNC] error creating RFB:", err);
          onError?.(err);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error("[VNC] " + err.message);
        onError?.(err);
      });

    return () => {
      isCancelled = true;
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect();
        } catch {
          // Ignore errors during cleanup - RFB might already be disconnected
        }
        rfbRef.current = null;
      }
    };
  }, [url, password, visible, onConnect, onDisconnect, onError]);

  // Keep viewOnly in sync if prop changes
  useEffect(() => {
    if (rfbRef.current) {
      rfbRef.current.viewOnly = !!viewOnly;
    }
  }, [viewOnly]);

  const classes = [
    className,
    "vnc-pane",
    hideCursor ? "novnc-hide-cursor" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={classes}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "black",
      }}
      tabIndex={0}  // Focusable
      onMouseDown={(e) => {
        // Ensure both the container and RFB get focus for keyboard input
        try {
          (e.currentTarget as HTMLDivElement).focus();
        } catch {}
        try {
          rfbRef.current?.focus();
        } catch {}
      }}
    />
  );
};

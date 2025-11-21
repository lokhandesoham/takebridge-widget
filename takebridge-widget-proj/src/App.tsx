import React, { useState, useEffect } from "react";
import { VncViewer } from "./components/VncViewer";

function App() {
  const [task, setTask] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [baseUrl, setBaseUrl] = useState(
    () => localStorage.getItem("tb_base_url") || "http://127.0.0.1:9000"
  );
  const [userId, setUserId] = useState(
    () => localStorage.getItem("tb_user_id") || "local-dev-user"
  );

  // VNC-related state
  const [vncUrl, setVncUrl] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("vncUrl") || "";
  });
  const [vncPassword, setVncPassword] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("vncPassword") || "";
  });
  const [showDesktop, setShowDesktop] = useState<boolean>(false);
  const [vncStatus, setVncStatus] = useState<string>("idle");
  const [vncError, setVncError] = useState<string | null>(null);

  // Persist vncUrl to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("vncUrl", vncUrl || "");
  }, [vncUrl]);

  // Persist vncPassword to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("vncPassword", vncPassword || "");
  }, [vncPassword]);

  // Helper to load workspace from Control Plane
  const loadWorkspaceFromControlPlane = async () => {
    setVncError(null);
    if (!baseUrl || !userId) {
      setVncError("Base URL and User ID are required to load workspace.");
      return;
    }
    try {
      const url = `${baseUrl.replace(/\/+$/, "")}/app/workspace?user_id=${encodeURIComponent(
        userId
      )}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data.vnc_url) {
        setVncUrl(data.vnc_url);
      } else {
        setVncError("Workspace found, but vnc_url is null. Backend not wired yet.");
      }
    } catch (err: any) {
      console.error("[App] loadWorkspace error:", err);
      setVncError(err?.message || "Failed to load workspace");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;

    setStatus("running");
    setError(null);
    setLastResult(null);

    try {
      if (!window.api) {
        throw new Error("API not available yet");
      }
      const result = await window.api.runTask({ task, baseUrl, userId });
      setLastResult(result);
      setStatus("done");
    } catch (err: any) {
      console.error(err);
      
      // Better error messages for common cases
      let errorMessage = err?.message || "Unknown error";
      
      // Check for network/orchestrator offline errors
      if (errorMessage.includes("Failed to fetch") || 
          errorMessage.includes("ECONNREFUSED") ||
          errorMessage.includes("network") ||
          errorMessage.includes("ENOTFOUND")) {
        errorMessage = "Cannot reach TakeBridge backend. Make sure the orchestrator is running.";
      } else if (errorMessage.includes("HTTP 500")) {
        // HTTP 500 errors - show the status code and details
        errorMessage = `Backend error (HTTP 500): ${errorMessage}`;
      } else if (errorMessage.includes("HTTP")) {
        // Other HTTP errors - preserve the message
        errorMessage = errorMessage;
      }
      
      setError(errorMessage);
      setStatus("error");
    }
  };

  return (
    <div 
      style={{ 
        padding: 16, 
        fontFamily: "system-ui",
        WebkitAppRegion: "drag" as any, // Make window draggable
        height: "100%",
        boxSizing: "border-box"
      }}
    >
      <h2 style={{ marginBottom: 8, WebkitAppRegion: "drag" as any }}>TakeBridge</h2>
      
      <button
        type="button"
        onClick={() => setShowSettings(!showSettings)}
        style={{
          fontSize: 11,
          marginBottom: 8,
          background: "transparent",
          border: "none",
          textDecoration: "underline",
          cursor: "pointer",
          padding: 0,
          color: "#888",
          WebkitAppRegion: "no-drag" as any,
        }}
      >
        {showSettings ? "Hide settings" : "Show settings"}
      </button>

      {showSettings && (
        <div 
          style={{ 
            marginBottom: 8, 
            fontSize: 11,
            padding: 8,
            background: "#1a1a1a",
            borderRadius: 4,
            border: "1px solid #333",
            WebkitAppRegion: "no-drag" as any,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 4 }}>Orchestrator URL</div>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => {
                const v = e.target.value;
                setBaseUrl(v);
                localStorage.setItem("tb_base_url", v);
              }}
              style={{ 
                width: "100%",
                padding: 4,
                background: "#111",
                border: "1px solid #333",
                color: "#eee",
                borderRadius: 2,
              }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>User ID</div>
            <input
              type="text"
              value={userId}
              onChange={(e) => {
                const v = e.target.value;
                setUserId(v);
                localStorage.setItem("tb_user_id", v);
              }}
              style={{ 
                width: "100%",
                padding: 4,
                background: "#111",
                border: "1px solid #333",
                color: "#eee",
                borderRadius: 2,
              }}
            />
          </div>

          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ fontWeight: 600, marginBottom: "0.25rem", fontSize: "0.9rem", color: "#eee" }}>VNC Desktop</h3>

            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", color: "#ccc" }}>
              VNC WebSocket URL
            </label>
            <input
              type="text"
              value={vncUrl}
              placeholder="ws://host:port/websockify"
              onChange={(e) => setVncUrl(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "4px 8px", 
                fontSize: "0.85rem",
                background: "#111",
                border: "1px solid #333",
                color: "#eee",
                borderRadius: 2,
              }}
            />

            <label
              style={{ display: "block", fontSize: "0.85rem", marginTop: "0.5rem", marginBottom: "0.25rem", color: "#ccc" }}
            >
              VNC Password
            </label>
            <input
              type="password"
              value={vncPassword}
              onChange={(e) => setVncPassword(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "4px 8px", 
                fontSize: "0.85rem",
                background: "#111",
                border: "1px solid #333",
                color: "#eee",
                borderRadius: 2,
              }}
              placeholder="Same password you use in your VNC client"
            />

            <div style={{ display: "flex", alignItems: "center", marginTop: "0.5rem", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={loadWorkspaceFromControlPlane}
                style={{ 
                  padding: "4px 8px", 
                  fontSize: "0.8rem",
                  background: "#333",
                  border: "1px solid #555",
                  color: "#eee",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                Load from workspace
              </button>

              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", color: "#ccc" }}>
                <input
                  type="checkbox"
                  checked={showDesktop}
                  onChange={(e) => setShowDesktop(e.target.checked)}
                />
                Show desktop preview
              </label>
            </div>

            {vncError && (
              <div style={{ color: "red", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                {vncError}
              </div>
            )}

            {vncStatus !== "idle" && (
              <div style={{ color: "#888", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                Desktop status: {vncStatus}
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Describe what you want the AI to do..."
          rows={4}
          style={{ 
            width: "100%", 
            resize: "none", 
            marginBottom: 8,
            WebkitAppRegion: "no-drag" as any // Keep textarea interactive
          }}
        />
        <button
          type="submit"
          disabled={status === "running"}
          style={{ 
            width: "100%", 
            padding: 8, 
            cursor: "pointer",
            WebkitAppRegion: "no-drag" as any // Keep button interactive
          }}
        >
          {status === "running" ? "Running..." : "Run Task"}
        </button>
      </form>

      {status === "error" && error && (
        <div 
          style={{ 
            color: "red", 
            marginTop: 8,
            padding: 8,
            background: "#2a1a1a",
            borderRadius: 4,
            fontSize: 12,
            WebkitAppRegion: "no-drag" as any
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {lastResult && (
        <div 
          style={{ 
            marginTop: 8,
            WebkitAppRegion: "no-drag" as any
          }}
        >
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <b>Status:</b> {lastResult.status || "unknown"}{" "}
            {lastResult.completion_reason && (
              <span>({lastResult.completion_reason})</span>
            )}
          </div>
          
          {Array.isArray(lastResult.steps) && lastResult.steps.length > 0 && (
            <div
              style={{
                maxHeight: 120,
                overflow: "auto",
                fontSize: 11,
                border: "1px solid #333",
                borderRadius: 4,
                padding: 6,
                marginTop: 4,
                background: "#1a1a1a",
              }}
            >
              {lastResult.steps.map((s: any, idx: number) => (
                <div key={s.step_index ?? idx} style={{ marginBottom: 6 }}>
                  <div><b>Step {s.step_index ?? idx + 1}</b></div>
                  {s.plan && (
                    <div style={{ marginTop: 2, color: "#ccc" }}>
                      Plan: {s.plan}
                    </div>
                  )}
                  {s.behavior_fact_thoughts && (
                    <div style={{ marginTop: 2, color: "#aaa", fontSize: 10 }}>
                      Behavior: {s.behavior_fact_thoughts}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <details style={{ marginTop: 4 }}>
            <summary 
              style={{ 
                fontSize: 11, 
                cursor: "pointer",
                color: "#888"
              }}
            >
              Raw JSON
            </summary>
            <pre
              style={{
                marginTop: 4,
                maxHeight: 150,
                overflow: "auto",
                fontSize: 10,
                background: "#111",
                color: "#eee",
                padding: 6,
                borderRadius: 4,
              }}
            >
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {showDesktop && vncUrl && (
        <div
          style={{
            marginTop: "1rem",
            border: "1px solid #444",
            borderRadius: "4px",
            height: "300px", // adjust as needed
            overflow: "hidden",
            WebkitAppRegion: "no-drag" as any,
          }}
        >
          <VncViewer
            url={vncUrl}
            password={vncPassword || undefined}
            viewOnly={false}
            visible={showDesktop}
            onConnect={() => {
              setVncStatus("connected");
              setVncError(null);
            }}
            onDisconnect={(reason) => {
              setVncStatus(`disconnected (${reason || "unknown"})`);
            }}
            onError={(err) => {
              console.error("[VNC] error:", err);
              setVncStatus("error");
              setVncError(
                err instanceof Error ? err.message : "Unknown error in VNC viewer"
              );
            }}
            className="vnc-viewer"
          />
        </div>
      )}
    </div>
  );
}

export default App;

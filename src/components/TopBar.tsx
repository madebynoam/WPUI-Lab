import React from "react";
import { Button, Icon } from "@wordpress/components";
import {
  plus as plusIcon,
  chevronLeft,
  drawerRight,
  code,
  listView,
} from "@wordpress/icons";
import { useComponentTree } from "@/contexts/ComponentTreeContext";
import { usePlayModeState } from "@/contexts/PlayModeContext";

interface TopBarProps {
  showInserter: boolean;
  onToggleInserter: () => void;
  showTreePanel: boolean;
  onToggleTreePanel: () => void;
  rightPanel: "props" | "code" | "none";
  onToggleRightPanel: (panel: "props" | "code" | "none") => void;
  onNavigateToProjects?: () => void;
  isCanvasView?: boolean;
  onToggleCanvasView?: () => void;
  binId: string;
  pageId: string;
  projectName?: string;
  // Cloud save props
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  showInserter,
  onToggleInserter,
  showTreePanel,
  onToggleTreePanel,
  rightPanel,
  onToggleRightPanel,
  onNavigateToProjects,
  isCanvasView,
  onToggleCanvasView,
  binId,
  pageId,
  projectName,
  isDirty,
  isSaving,
  onSave,
}) => {
  const { currentPageId, isPlayMode, setPlayMode } = useComponentTree();
  const playModeState = usePlayModeState();

  return (
    <div
      className="editor-header"
      style={{
        height: "60px",
        width: "100%",
        backgroundColor: "#fff",
        borderBottom: "1px solid rgba(0, 0, 0, 0.133)",
        display: "grid",
        gridTemplateColumns: "60px auto 1fr auto 260px",
        alignItems: "center",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Left side - Site icon hub or back button (play mode) */}
      {isPlayMode ? (
        <div
          style={{
            height: "60px",
            width: "60px",
            backgroundColor: "#1e1e1e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => {
            playModeState.resetAllState();
            setPlayMode(false);
          }}
          title="Exit play mode"
        >
          <Button icon={chevronLeft} iconSize={24} style={{ color: "#fff" }} />
        </div>
      ) : (
        <div
          className="editor-header__toolbar"
          onClick={onNavigateToProjects}
          style={{
            height: "60px",
            width: "60px",
            backgroundColor: "#1e1e1e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 0,
            gap: "4px",
            cursor: onNavigateToProjects ? "pointer" : "default",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => {
            if (onNavigateToProjects) {
              e.currentTarget.style.opacity = "0.8";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          title={onNavigateToProjects ? "Back to projects" : undefined}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-2 -2 24 24"
            width="36"
            height="36"
            style={{ display: "block" }}
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="#fff"
              d="M20 10c0-5.51-4.49-10-10-10C4.48 0 0 4.49 0 10c0 5.52 4.48 10 10 10 5.51 0 10-4.48 10-10zM7.78 15.37L4.37 6.22c.55-.02 1.17-.08 1.17-.08.5-.06.44-1.13-.06-1.11 0 0-1.45.11-2.37.11-.18 0-.37 0-.58-.01C4.12 2.69 6.87 1.11 10 1.11c2.33 0 4.45.87 6.05 2.34-.68-.11-1.65.39-1.65 1.58 0 .74.45 1.36.9 2.1.35.61.55 1.36.55 2.46 0 1.49-1.4 5-1.4 5l-3.03-8.37c.54-.02.82-.17.82-.17.5-.05.44-1.25-.06-1.22 0 0-1.44.12-2.38.12-.87 0-2.33-.12-2.33-.12-.5-.03-.56 1.2-.06 1.22l.92.08 1.26 3.41zM17.41 10c.24-.64.74-1.87.43-4.25.7 1.29 1.05 2.71 1.05 4.25 0 3.29-1.73 6.24-4.4 7.78.97-2.59 1.94-5.2 2.92-7.78zM6.1 18.09C3.12 16.65 1.11 13.53 1.11 10c0-1.3.23-2.48.72-3.59C3.25 10.3 4.67 14.2 6.1 18.09zm4.03-6.63l2.58 6.98c-.86.29-1.76.45-2.71.45-.79 0-1.57-.11-2.29-.33.81-2.38 1.62-4.74 2.42-7.10z"
            />
          </svg>
        </div>
      )}

      {/* Left panel toggles - Inserter and Layers - hidden in play mode */}
      {!isPlayMode && (
        <div
          style={{
            gridColumn: "2 / 3",
            paddingLeft: "16px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {/* Inserter toggle button */}
          <Button
            icon={plusIcon}
            onClick={onToggleInserter}
            title={showInserter ? "Close inserter" : "Open inserter"}
            style={{
              backgroundColor: showInserter ? "#1e1e1e" : "transparent",
              color: showInserter ? "#fff" : "#666",
              border: "none",
              outline: "none",
              boxShadow: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          />

          {/* Layers/Tree panel toggle button */}
          <Button
            icon={listView}
            onClick={onToggleTreePanel}
            title={showTreePanel ? "Close layers" : "Open layers"}
            style={{
              backgroundColor: showTreePanel ? "#1e1e1e" : "transparent",
              color: showTreePanel ? "#fff" : "#666",
              border: "none",
              outline: "none",
              boxShadow: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          />

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 24,
              backgroundColor: "rgba(0,0,0,0.1)",
              marginLeft: 4,
              marginRight: 4,
            }}
          />

          {/* Canvas view toggle button */}
          {onToggleCanvasView && (
            <button
              onClick={onToggleCanvasView}
              title={isCanvasView ? "Exit canvas view" : "View all pages"}
              style={{
                backgroundColor: isCanvasView ? "#1e1e1e" : "transparent",
                color: isCanvasView ? "#fff" : "#666",
                border: "none",
                outline: "none",
                boxShadow: "none",
                borderRadius: "2px",
                cursor: "pointer",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          )}

          {/* Mode switcher container */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#f0f0f0",
              borderRadius: "4px",
              padding: "2px",
              gap: "2px",
            }}
          >
            {/* Mode switcher buttons - COMMENTED OUT (now using RichTextControl in Properties Panel) */}
            {/* Selection mode button */}
            {/* <button
              onClick={() => setEditingMode('selection')}
              title="Selection Mode (V)"
              style={{
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                boxShadow: "none",
                borderRadius: "2px",
                cursor: "pointer",
                minWidth: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  color: editingMode === 'selection' ? "#3858e9" : "#757575",
                }}
              >
                <path fillRule="evenodd" clipRule="evenodd" d="M3.21457 3.21454C3.42171 3.0055 3.73526 2.94279 4.00702 3.05491L20.5477 9.86578C20.8385 9.9855 21.0209 10.2801 20.9981 10.5936C20.9753 10.9072 20.7529 11.1713 20.447 11.2493L13.2294 13.0527C13.142 13.0755 13.0755 13.142 13.0527 13.2294L11.2493 20.447C11.1713 20.7529 10.9072 20.9753 10.5936 20.9981C10.28 21.0209 9.9855 20.8385 9.86578 20.5477L3.05491 4.00702C2.94278 3.73527 3.00554 3.42168 3.21457 3.21454ZM10.3713 17.9421L11.637 12.8758C11.789 12.2657 12.266 11.7887 12.876 11.6367L17.9423 10.3711L5.07126 5.07074L10.3713 17.9421Z" fill="currentColor"/>
              </svg>
            </button> */}

            {/* Text mode button */}
            {/* <button
              onClick={() => setEditingMode('text')}
              title="Text Mode (T)"
              style={{
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                boxShadow: "none",
                borderRadius: "2px",
                cursor: "pointer",
                minWidth: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  color: editingMode === 'text' ? "#3858e9" : "#757575",
                }}
              >
                <path d="M19.5475 3C19.9467 3 20.296 3.27217 20.3935 3.66001L20.9742 5.98255C21.0898 6.44978 20.8063 6.92155 20.3391 7.03721C19.8718 7.15515 19.4001 6.87164 19.2844 6.40444L18.8693 4.74191H12.8702V19.2578H15.4831C15.9639 19.2578 16.354 19.6479 16.354 20.1287C16.354 20.6096 15.9639 20.9997 15.4831 20.9997H8.51545C8.03461 20.9997 7.6445 20.6096 7.6445 20.1287C7.6445 19.6479 8.03461 19.2578 8.51545 19.2578H11.1283V4.74191H5.13151L4.71644 6.40444C4.59851 6.87167 4.12675 7.1552 3.65952 7.03721C3.19228 6.92154 2.90875 6.44979 3.02674 5.98255L3.60737 3.66001C3.70263 3.27216 4.05192 3 4.45109 3H19.5475Z" fill="currentColor"/>
              </svg>
            </button> */}
          </div>
        </div>
      )}

      {/* Center - Document Bar */}
      <div
        className="editor-header__center"
        style={{
          gridColumn: "3 / 4",
          justifySelf: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#1e1e1e",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {isCanvasView
            ? `${projectName || "WP Designer"} / All pages`
            : projectName || "WP Designer"}
        </div>
      </div>

      {/* Right side - Settings - hidden in play mode */}
      {!isPlayMode && (
        <div
          className="editor-header__settings"
          style={{
            gridColumn: "4 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "8px",
            paddingRight: "8px",
          }}
        >
          {/* Sidebar toggle button */}
          <Button
            icon={drawerRight}
            onClick={() =>
              onToggleRightPanel(rightPanel === "props" ? "none" : "props")
            }
            title="Toggle properties panel"
            style={{
              backgroundColor:
                rightPanel === "props" ? "#1e1e1e" : "transparent",
              color: rightPanel === "props" ? "#fff" : "#666",
              border: "none",
              outline: "none",
              boxShadow: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          />

          {/* Code panel toggle button */}
          <Button
            icon={code}
            onClick={() =>
              onToggleRightPanel(rightPanel === "code" ? "none" : "code")
            }
            title="Toggle code panel"
            style={{
              backgroundColor:
                rightPanel === "code" ? "#1e1e1e" : "transparent",
              color: rightPanel === "code" ? "#fff" : "#666",
              border: "none",
              outline: "none",
              boxShadow: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          />

          {/* Cloud Save button */}
          {onSave && (
            <Button
              onClick={onSave}
              disabled={isSaving}
              variant={isDirty ? "primary" : "secondary"}
              style={{
                backgroundColor: isDirty ? "#3858e9" : "#f0f0f0",
                color: isDirty ? "#fff" : "#1e1e1e",
                border: "none",
                borderRadius: "2px",
                padding: "0 16px",
                height: "36px",
                fontSize: "13px",
                fontWeight: 400,
                cursor: isSaving ? "wait" : "pointer",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Saving..." : isDirty ? "Save" : "Saved"}
            </Button>
          )}

          <Button
            onClick={() =>
              window.open(`/play/${binId}/${currentPageId}`, "_blank")
            }
            variant="primary"
            style={{
              backgroundColor: "#3858e9",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              padding: "0 16px",
              height: "36px",
              fontSize: "13px",
              fontWeight: 400,
              cursor: "pointer",
            }}
          >
            Play
          </Button>
        </div>
      )}
    </div>
  );
};

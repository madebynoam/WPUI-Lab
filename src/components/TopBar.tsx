import React from "react";
import { Button } from "@wordpress/components";
import {
  plus as plusIcon,
  chevronLeft,
  drawerRight,
  code,
  listView,
} from "@wordpress/icons";
import { useComponentTree } from "../ComponentTreeContext";
import { usePlayModeState } from "../PlayModeContext";

interface TopBarProps {
  showInserter: boolean;
  onToggleInserter: () => void;
  showTreePanel: boolean;
  onToggleTreePanel: () => void;
  rightPanel: "props" | "code" | "agent" | "none";
  onToggleRightPanel: (panel: "props" | "code" | "agent" | "none") => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  showInserter,
  onToggleInserter,
  showTreePanel,
  onToggleTreePanel,
  rightPanel,
  onToggleRightPanel,
}) => {
  const { pages, currentPageId, isPlayMode, setPlayMode } = useComponentTree();
  const playModeState = usePlayModeState();
  const currentPage = pages.find((p) => p.id === currentPageId);

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
          style={{
            height: "60px",
            width: "60px",
            backgroundColor: "#1e1e1e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 0,
            gap: "4px",
          }}
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
          {currentPage?.name || "WP Designer"}
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
          {/* AI Agent panel toggle button */}
          <Button
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.6611 11.5224L16.3782 10.39C15.0799 9.94388 14.0561 8.92011 13.61 7.62181L12.4776 4.33887C12.3231 3.88704 11.6769 3.88704 11.5224 4.33887L10.39 7.62181C9.94388 8.92011 8.92011 9.94388 7.62181 10.39L4.33887 11.5224C3.88704 11.6769 3.88704 12.3231 4.33887 12.4776L7.62181 13.61C8.92011 14.0561 9.94388 15.0799 10.39 16.3782L11.5224 19.6611C11.6769 20.113 12.3231 20.113 12.4776 19.6611L13.61 16.3782C14.0561 15.0799 15.0799 14.0561 16.3782 13.61L19.6611 12.4776C20.113 12.3231 20.113 11.6769 19.6611 11.5224ZM15.8291 12.2431L14.1877 12.8093C13.5357 13.0324 13.0266 13.5471 12.8036 14.1934L12.2374 15.8349C12.1573 16.0636 11.837 16.0636 11.7569 15.8349L11.1907 14.1934C10.9677 13.5414 10.4529 13.0324 9.80661 12.8093L8.16515 12.2431C7.93637 12.163 7.93637 11.8427 8.16515 11.7626L9.80661 11.1964C10.4586 10.9734 10.9677 10.4586 11.1907 9.81233L11.7569 8.17087C11.837 7.94209 12.1573 7.94209 12.2374 8.17087L12.8036 9.81233C13.0266 10.4643 13.5414 10.9734 14.1877 11.1964L15.8291 11.7626C16.0579 11.8427 16.0579 12.163 15.8291 12.2431Z"
                  fill={rightPanel === "agent" ? "#fff" : "#3858E9"}
                />
              </svg>
            }
            onClick={() =>
              onToggleRightPanel(rightPanel === "agent" ? "none" : "agent")
            }
            title="Toggle AI assistant"
            style={{
              backgroundColor:
                rightPanel === "agent" ? "#1e1e1e" : "transparent",
              color: rightPanel === "agent" ? "#fff" : "#666",
              border: "none",
              outline: "none",
              boxShadow: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          />

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

          <Button
            onClick={() => setPlayMode(true)}
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

import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import WorkspaceDialog, { WorkspaceDialogFooter } from "./WorkspaceDialog";
import Button, { IconButton } from "./ui/Button";
export default function ChatScreenshotViewer({
  file,
  onClose,
}: {
  file: File;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(""),
    [natural, setNatural] = useState({ width: 1, height: 1 }),
    [scale, setScale] = useState(1),
    [panning, setPanning] = useState(false);
  const viewport = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; left: number; top: number } | null>(
      null,
    );
  useEffect(() => {
    const src = URL.createObjectURL(file);
    setUrl(src);
    return () => URL.revokeObjectURL(src);
  }, [file]);
  const fit = (width = natural.width) => {
    const host = viewport.current;
    if (host) {
      setScale(Math.min(4, Math.max(0.1, (host.clientWidth - 16) / width)));
      host.scrollTo(0, 0);
    }
  };
  const zoom = (next: number) => setScale(Math.max(0.1, Math.min(4, next)));
  return (
    <WorkspaceDialog
      title="查看截图"
      size="chat"
      onClose={onClose}
      className="chat-screenshot-dialog"
      bodyClassName="p-0 min-h-0"
    >
      <div
        ref={viewport}
        className="chat-screenshot-viewport"
        data-panning={panning}
        aria-label="放大截图，可滚动或拖动查看"
        onPointerDown={(e) => {
          if (
            e.pointerType !== "mouse" ||
            e.button !== 0 ||
            !(e.target instanceof HTMLImageElement)
          )
            return;
          const host = e.currentTarget;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: host.scrollLeft,
            top: host.scrollTop,
          };
          host.setPointerCapture(e.pointerId);
          setPanning(true);
          e.preventDefault();
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          e.currentTarget.scrollLeft =
            drag.current.left + drag.current.x - e.clientX;
          e.currentTarget.scrollTop =
            drag.current.top + drag.current.y - e.clientY;
        }}
        onPointerUp={(e) => {
          drag.current = null;
          setPanning(false);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPanning(false);
        }}
      >
        {url && (
          <img
            src={url}
            alt={file.name}
            draggable={false}
            style={{ width: natural.width * scale, maxWidth: "none" }}
            onLoad={(e) => {
              const image = e.currentTarget;
              setNatural({
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
              fit(image.naturalWidth);
            }}
          />
        )}
      </div>
      <WorkspaceDialogFooter>
        <Button size="sm" onClick={() => fit()}>
          适应宽度
        </Button>
        <Button size="sm" onClick={() => zoom(1)}>
          原始大小
        </Button>
        <IconButton
          aria-label="缩小截图"
          disabled={scale <= 0.1}
          onClick={() => zoom(scale / 1.25)}
        >
          <ZoomOut size={18} />
        </IconButton>
        <span className="text-xs tabular-nums text-gray-500" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <IconButton
          aria-label="放大截图"
          disabled={scale >= 4}
          onClick={() => zoom(scale * 1.25)}
        >
          <ZoomIn size={18} />
        </IconButton>
      </WorkspaceDialogFooter>
    </WorkspaceDialog>
  );
}

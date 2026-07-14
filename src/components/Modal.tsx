import { useEffect, useRef } from "react";

export default function Modal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none hover:text-gray-500"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
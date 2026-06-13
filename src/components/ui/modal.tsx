import React from "react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onOpenChange, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[350px] max-w-full">
        {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        {children}
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={() => onOpenChange(false)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

"use client";

type Props = {
  src: string | null;
  onClose: () => void;
};

export default function ImageLightbox({ src, onClose }: Props) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 border rounded px-3 py-2 text-white opacity-80 hover:opacity-100"
        type="button"
      >
        Close
      </button>

      <img
        src={src}
        alt="Preview"
        className="max-h-[90vh] max-w-[90vw] object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

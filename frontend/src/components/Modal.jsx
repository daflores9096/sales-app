export default function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="m-4 mb-0 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#0b2545] to-[#0f3a68] px-5 py-4 text-white shadow-lg shadow-blue-900/25">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

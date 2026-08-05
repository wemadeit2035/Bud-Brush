export default function ToastNotification({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className={`toast-notification ${toast ? "show" : ""}`}>
      <div className="toast-icon">
        <i className="fas fa-check-circle" />
      </div>
      <div className="toast-content">
        <div className="toast-title font-semibold">{toast.title}</div>
        <div className="toast-message text-sm">{toast.message}</div>
      </div>
      <button className="toast-close" type="button" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

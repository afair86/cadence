import { useEffect } from 'react';
import { useContactActions } from '../../context/ContactActionContext';
import '../contacts/add-contact-modal.scss';

export default function Toast() {
  const { toast, clearToast } = useContactActions();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 4000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.type}`} role="status">
      {toast.message}
    </div>
  );
}

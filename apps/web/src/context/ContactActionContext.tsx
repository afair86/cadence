import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Contact, ContactMethod } from '@cadence/shared';
import { createActivity, fetchContact } from '../lib/api';
import { activityTypeForAction, missingContactField, channelValue } from '../lib/contactActions';
import ContactActionModal from '../components/contacts/ContactActionModal';
import Toast from '../components/ui/Toast';
import AddContactModal from '../components/contacts/AddContactModal';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface CompletedAction {
  contact: Contact;
  action: ContactMethod;
  pointsEarned: number;
}

interface ContactActionContextValue {
  toast: ToastState | null;
  clearToast: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  runContactAction: (contactId: string, action: ContactMethod) => Promise<boolean>;
  showAddContact: boolean;
  openAddContact: () => void;
  closeAddContact: () => void;
  contactsVersion: number;
  notifyContactsChanged: () => void;
}

const ContactActionContext = createContext<ContactActionContextValue | null>(null);

export function ContactActionProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactsVersion, setContactsVersion] = useState(0);
  const [completedAction, setCompletedAction] = useState<CompletedAction | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const runContactAction = useCallback(async (contactId: string, action: ContactMethod) => {
    try {
      const contact = await fetchContact(contactId);
      const value = channelValue(contact, action);

      if (!value) {
        setToast({
          type: 'error',
          message: `No ${missingContactField(action)} on file for ${contact.name}. Edit the contact to add one.`,
        });
        return false;
      }

      const activity = await createActivity({
        contactId,
        type: activityTypeForAction(action),
        notes: `Logged via Cadence (${action})`,
      });

      setCompletedAction({
        contact,
        action,
        pointsEarned: activity.points,
      });
      return true;
    } catch (err) {
      setToast({
        type: 'error',
        message: (err as Error).message || 'Something went wrong. Try signing in again.',
      });
      return false;
    }
  }, []);

  return (
    <ContactActionContext.Provider
      value={{
        toast,
        clearToast,
        showToast,
        runContactAction,
        showAddContact,
        openAddContact: () => setShowAddContact(true),
        closeAddContact: () => setShowAddContact(false),
        contactsVersion,
        notifyContactsChanged: () => setContactsVersion((v) => v + 1),
      }}
    >
      {children}
      <AddContactModal />
      <Toast />
      {completedAction ? (
        <ContactActionModal
          contact={completedAction.contact}
          action={completedAction.action}
          pointsEarned={completedAction.pointsEarned}
          onClose={() => setCompletedAction(null)}
        />
      ) : null}
    </ContactActionContext.Provider>
  );
}

export function useContactActions() {
  const ctx = useContext(ContactActionContext);
  if (!ctx) throw new Error('useContactActions must be used within ContactActionProvider');
  return ctx;
}

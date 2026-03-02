import { useState, useCallback, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { AppLayout } from '../components/layout/AppLayout';
import { DocumentList } from '../features/documents';
import { DocumentView } from '../features/documents';
import type { DocumentListItem, DocumentViewSpec } from '../features/documents';
import './DocumentsPage.scss';

export const DocumentsPage = observer(function DocumentsPage() {
  const { specs: specStore } = useStore();
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>();

  const documentListItems: DocumentListItem[] = useMemo(
    () =>
      specStore.documentList.map((doc) => ({
        id: doc.id,
        title: doc.title,
        specCount: doc.specIds.length,
        updatedAt: doc.updatedAt,
      })),
    [specStore.documentList],
  );

  const selectedDocument = selectedDocId
    ? specStore.documents.get(selectedDocId)
    : undefined;

  const selectedSpecs: DocumentViewSpec[] = useMemo(() => {
    if (!selectedDocument) return [];
    return selectedDocument.specIds
      .map((specId) => specStore.specs.get(specId))
      .filter((s): s is NonNullable<typeof s> => s !== undefined)
      .map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        status: 'draft',
      }));
  }, [selectedDocument, specStore.specs]);

  const handleSelect = useCallback((id: string) => {
    setSelectedDocId(id);
  }, []);

  const handleCreate = useCallback(() => {
    // Placeholder: in a full implementation this would trigger a create flow
    setSelectedDocId(undefined);
  }, []);

  const handleSpecSelect = useCallback((_specId: string) => {
    // Placeholder: would scroll to / focus the selected spec
  }, []);

  const handleSpecUpdate = useCallback(
    (specId: string, content: string) => {
      const existing = specStore.specs.get(specId);
      if (existing) {
        specStore.setSpec({ ...existing, content });
      }
    },
    [specStore],
  );

  return (
    <AppLayout>
      <div className="DocumentsPage">
        <aside className="DocumentsPage__sidebar">
          <DocumentList
            documents={documentListItems}
            selectedId={selectedDocId}
            onSelect={handleSelect}
            onCreate={handleCreate}
          />
        </aside>

        <div className="DocumentsPage__main">
          {selectedDocument ? (
            <DocumentView
              documentId={selectedDocument.id}
              title={selectedDocument.title}
              specs={selectedSpecs}
              onSpecSelect={handleSpecSelect}
              onSpecUpdate={handleSpecUpdate}
            />
          ) : (
            <div className="DocumentsPage__empty">
              <span className="DocumentsPage__emptyTitle">
                Select a document
              </span>
              <span className="DocumentsPage__emptyDescription">
                Choose a document from the sidebar to view and edit its specs,
                or create a new document to get started.
              </span>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
});

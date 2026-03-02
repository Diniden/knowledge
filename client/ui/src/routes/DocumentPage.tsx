import { useParams } from 'react-router-dom';

export function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();

  return (
    <div className="DocumentPage">
      <h1>Document</h1>
      <p>Editing document: {documentId}</p>
    </div>
  );
}

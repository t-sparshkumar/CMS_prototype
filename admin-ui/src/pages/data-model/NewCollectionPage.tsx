import { useNavigate, useSearchParams } from 'react-router-dom';
import CreateCollectionModal from '../../components/data-model/CreateCollectionModal';
import CreateFolderModal from '../../components/data-model/CreateFolderModal';

export default function NewCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') === 'folder' ? 'folder' : 'collection';
  const parent = searchParams.get('parent');

  function handleClose() {
    if (parent) {
      navigate(`/settings/data-model/${parent}`);
      return;
    }
    navigate('/settings/data-model');
  }

  function handleCreated(collection: { collection: string }) {
    navigate(`/settings/data-model/${collection.collection}`);
  }

  if (type === 'folder') {
    return (
      <CreateFolderModal parent={parent} onClose={handleClose} onCreated={handleCreated} />
    );
  }

  return (
    <CreateCollectionModal parent={parent} onClose={handleClose} onCreated={handleCreated} />
  );
}

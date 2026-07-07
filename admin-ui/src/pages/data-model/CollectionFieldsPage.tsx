import { useParams } from 'react-router-dom';
import FieldsManagement from '../../components/data-model/FieldsManagement';

export default function CollectionFieldsPage() {
  const { collection = '' } = useParams<{ collection: string }>();
  return <FieldsManagement collection={collection} />;
}

import { useRouter } from 'next/router';
import UserProfilePage from '../../components/UserProfilePage';

export default function Profile() {
  const router = useRouter();
  const { address } = router.query;

  if (!address) return <div className="text-center py-12 text-lg text-gray-400">Loading...</div>;

  return <UserProfilePage address={address} />;
}

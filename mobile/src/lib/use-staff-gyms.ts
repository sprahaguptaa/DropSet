import { useEffect, useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';

import { getStaffGyms, type StaffGym } from './api';

// Gyms the signed-in user works the front desk at. null while loading; [] for travelers.
export function useStaffGyms(): StaffGym[] | null {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; gyms: StaffGym[] } | null>(null);

  useEffect(() => {
    if (!userId) return;
    getStaffGyms()
      .then((gyms) => setLoaded({ userId, gyms }))
      .catch(() => setLoaded({ userId, gyms: [] }));
  }, [userId]);

  if (!userId) return [];
  return loaded?.userId === userId ? loaded.gyms : null;
}

import * as Location from 'expo-location';

export class LocationError extends Error {}

// Device location for "Near me". Throws LocationError with a message we can show as-is.
export async function currentPosition() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new LocationError('Allow location access to see gyms near you, or pick a city instead.');
  try {
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: coords.latitude, lng: coords.longitude };
  } catch {
    throw new LocationError('We couldn’t find your location. Pick a city instead.');
  }
}

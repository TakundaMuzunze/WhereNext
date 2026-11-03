export function distanceMetres(latitude: number, longitude: number, otherLatitude: number, otherLongitude: number) {
  const earthRadiusMetres = 6_371_000;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;

  const startLatitudeRadians = radians(latitude);
  const endLatitudeRadians = radians(otherLatitude);
  const latitudeDifference = radians(otherLatitude - latitude);
  const longitudeDifference = radians(otherLongitude - longitude);

  const latitudeArc = Math.sin(latitudeDifference / 2) ** 2;
  const longitudeArc = Math.cos(startLatitudeRadians) * Math.cos(endLatitudeRadians) * Math.sin(longitudeDifference / 2) ** 2;
  const combinedArc = latitudeArc + longitudeArc;
  const remainingArc = Math.max(0, 1 - combinedArc);

  const halfCentralAngle = Math.atan2(Math.sqrt(combinedArc), Math.sqrt(remainingArc));

  return earthRadiusMetres * 2 * halfCentralAngle;
}

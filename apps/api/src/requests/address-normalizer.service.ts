import { Injectable } from "@nestjs/common";

export type ConfirmedAddress = {
  crossStreetOne?: string;
  crossStreetTwo?: string;
  latitude?: string;
  longitude?: string;
  neighborhood?: string;
  normalizedAddress?: string;
  number: string;
  street: string;
};

export type ResolvedAddress = Partial<ConfirmedAddress> & {
  latitude: string;
  longitude: string;
};

/** Provider boundary: staging currently uses the confirmed manual value. */
@Injectable()
export class AddressNormalizerService {
  async normalize(address: ConfirmedAddress): Promise<ConfirmedAddress> {
    const manual = {
      ...address,
      normalizedAddress: address.normalizedAddress ?? `${address.street} ${address.number}`,
    };
    const key = process.env.PIGAR_GOOGLE_GEOCODING_KEY;
    if (!key) return manual;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(manual.normalizedAddress ?? "")}&key=${encodeURIComponent(key)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      const payload: unknown = await response.json();
      const result = firstGeocode(payload, manual);
      return result ?? manual;
    } catch {
      return manual;
    }
  }

  async reverse(latitude: string, longitude: string): Promise<ResolvedAddress | undefined> {
    const key = process.env.PIGAR_GOOGLE_GEOCODING_KEY;
    if (!key) return undefined;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(`${latitude},${longitude}`)}&language=es&key=${encodeURIComponent(key)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      return reverseGeocode(await response.json(), latitude, longitude);
    } catch {
      return undefined;
    }
  }
}

function reverseGeocode(
  payload: unknown,
  latitude: string,
  longitude: string,
): ResolvedAddress | undefined {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("results" in payload) ||
    !Array.isArray(payload.results)
  )
    return undefined;
  const first = payload.results[0];
  if (!first || typeof first !== "object" || !("address_components" in first)) return undefined;
  const components = first.address_components;
  if (!Array.isArray(components)) return undefined;
  const component = (type: string) => {
    const found = components.find(
      (item) =>
        item &&
        typeof item === "object" &&
        "types" in item &&
        Array.isArray(item.types) &&
        item.types.includes(type) &&
        "long_name" in item &&
        typeof item.long_name === "string",
    );
    return found &&
      typeof found === "object" &&
      "long_name" in found &&
      typeof found.long_name === "string"
      ? found.long_name
      : undefined;
  };
  const normalizedAddress =
    "formatted_address" in first && typeof first.formatted_address === "string"
      ? first.formatted_address
      : undefined;
  return {
    latitude,
    longitude,
    ...(component("route") ? { street: component("route") } : {}),
    ...(component("street_number") ? { number: component("street_number") } : {}),
    ...(component("neighborhood") || component("sublocality")
      ? { neighborhood: component("neighborhood") ?? component("sublocality") }
      : {}),
    ...(normalizedAddress ? { normalizedAddress } : {}),
  };
}

function firstGeocode(payload: unknown, manual: ConfirmedAddress): ConfirmedAddress | undefined {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("results" in payload) ||
    !Array.isArray(payload.results)
  )
    return undefined;
  const first = payload.results[0];
  if (
    !first ||
    typeof first !== "object" ||
    !("formatted_address" in first) ||
    !("geometry" in first)
  )
    return undefined;
  const geometry = first.geometry;
  if (!geometry || typeof geometry !== "object" || !("location" in geometry)) return undefined;
  const location = geometry.location;
  if (
    !location ||
    typeof location !== "object" ||
    typeof first.formatted_address !== "string" ||
    !("lat" in location) ||
    !("lng" in location) ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number"
  )
    return undefined;
  return {
    ...manual,
    normalizedAddress: first.formatted_address,
    latitude: location.lat.toFixed(6),
    longitude: location.lng.toFixed(6),
  };
}

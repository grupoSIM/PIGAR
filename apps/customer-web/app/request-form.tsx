"use client";

import { useEffect, useRef, useState } from "react";

type Offer = {
  category: { id: string; name: string; scope: string };
  currency: string;
  price: string;
};

type PlaceLocation = { lat: () => number; lng: () => number };
type PlaceComponent = { longText?: string; long_name?: string; types?: string[] };
type SelectedPlace = {
  addressComponents?: PlaceComponent[];
  fetchFields: (options: { fields: string[] }) => Promise<void>;
  formattedAddress?: string;
  location?: PlaceLocation;
};
type PlaceSelectionEvent = Event & {
  placePrediction?: { toPlace: () => SelectedPlace };
};
type MapInstance = {
  addListener: (event: string, listener: (event: { latLng?: PlaceLocation }) => void) => void;
  setCenter: (location: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};
type MarkerInstance = {
  setMap: (map: MapInstance | null) => void;
  setPosition: (position: { lat: number; lng: number }) => void;
};
type MapsLibrary = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
};
type PlacesLibrary = { PlaceAutocompleteElement: new () => HTMLElement };
type ResolvedAddress = {
  latitude: string;
  longitude: string;
  neighborhood?: string;
  normalizedAddress?: string;
  number?: string;
  street?: string;
};

declare global {
  interface Window {
    google?: {
      maps: {
        Marker: new (options: {
          map: MapInstance;
          position: { lat: number; lng: number };
        }) => MarkerInstance;
        importLibrary: (library: string) => Promise<unknown>;
      };
    };
  }
}

export function RequestForm({ mapsApiKey }: { mapsApiKey?: string | undefined }) {
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<MarkerInstance | null>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const setPinRef = useRef<((latitude: number, longitude: number) => void) | null>(null);
  const reverseGeocodeRef = useRef<((latitude: number, longitude: number) => Promise<void>) | null>(
    null,
  );
  const [message, setMessage] = useState<string>();
  const [mapStatus, setMapStatus] = useState("Cargando buscador de direcciones…");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [submitting, setSubmitting] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string>();
  const [pendingEvidence, setPendingEvidence] = useState<File[]>([]);
  const [evidenceAttached, setEvidenceAttached] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  useEffect(() => {
    void fetch("/api/offers")
      .then(async (response) => {
        if (!response.ok) throw new Error("offers");
        return (await response.json()) as { items?: Offer[] };
      })
      .then(({ items = [] }) => {
        setOffers(items);
        setSelectedOfferId(items[0]?.category.id ?? "");
      })
      .catch(() =>
        setMessage("No pudimos cargar la oferta vigente. Actualizá la página e intentá de nuevo."),
      );
  }, []);

  useEffect(() => {
    if (!mapsApiKey || !autocompleteRef.current || !mapRef.current) {
      setMapStatus("Podés completar el domicilio manualmente.");
      return;
    }

    let disposed = false;
    const scriptId = "pigar-google-maps";
    const load = async () => {
      if (!window.google) {
        const current = document.getElementById(scriptId) as HTMLScriptElement | null;
        const script = current ?? document.createElement("script");
        if (!current) {
          script.id = scriptId;
          script.async = true;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsApiKey)}&v=weekly`;
          document.head.appendChild(script);
        }
        await new Promise<void>((resolve, reject) => {
          script.addEventListener("load", () => resolve(), { once: true });
          script.addEventListener("error", () => reject(new Error("maps")), { once: true });
          if (window.google) resolve();
        });
      }
      if (!window.google || disposed || !autocompleteRef.current || !mapRef.current) return;

      const googleMaps = window.google.maps;
      const [maps, places] = (await Promise.all([
        googleMaps.importLibrary("maps"),
        googleMaps.importLibrary("places"),
      ])) as [MapsLibrary, PlacesLibrary];
      if (disposed || !autocompleteRef.current || !mapRef.current) return;
      const map = new maps.Map(mapRef.current, {
        center: { lat: -34.6037, lng: -58.3816 },
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        zoom: 12,
      });
      mapInstanceRef.current = map;
      const autocomplete = new places.PlaceAutocompleteElement();
      autocomplete.setAttribute("placeholder", "Buscá calle, número y localidad");
      autocompleteRef.current.replaceChildren(autocomplete);

      const setPin = (latitude: number, longitude: number) => {
        const position = { lat: latitude, lng: longitude };
        if (markerRef.current) markerRef.current.setPosition(position);
        else markerRef.current = new googleMaps.Marker({ map, position });
        map.setCenter(position);
        map.setZoom(17);
        setCoordinates({ latitude, longitude });
      };
      setPinRef.current = setPin;
      const reverseGeocode = async (latitude: number, longitude: number) => {
        setMapStatus("Buscando el domicilio del punto seleccionado…");
        try {
          const response = await fetch("/api/address/resolve", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6),
            }),
          });
          if (!response.ok) throw new Error("no-address");
          const resolved = (await response.json()) as { address?: ResolvedAddress | null };
          if (!resolved.address) throw new Error("no-address");
          fillResolvedAddress(resolved.address);
          setMapStatus(
            "Domicilio cargado desde el mapa. Revisá calle y número antes de continuar.",
          );
        } catch {
          setMapStatus(
            "Pin actualizado. Google no pudo resolver el domicilio exacto; completá calle y número manualmente.",
          );
        }
      };
      reverseGeocodeRef.current = reverseGeocode;
      map.addListener("click", (event) => {
        if (!event.latLng) return;
        const latitude = event.latLng.lat();
        const longitude = event.latLng.lng();
        setPin(latitude, longitude);
        void reverseGeocode(latitude, longitude);
      });
      const selectPlace = async (event: Event) => {
        const prediction = (event as PlaceSelectionEvent).placePrediction;
        if (!prediction) return;
        const place = prediction.toPlace();
        await place.fetchFields({ fields: ["addressComponents", "formattedAddress", "location"] });
        if (disposed) return;
        fillAddress(place);
        if (place.location) setPin(place.location.lat(), place.location.lng());
        setMapStatus("Dirección seleccionada. Revisá los datos antes de enviar.");
      };
      autocomplete.addEventListener("gmp-select", selectPlace);
      autocomplete.addEventListener("gmp-placeselect", selectPlace);
      setMapStatus("Elegí una dirección o ubicá el pin sobre el mapa.");
    };
    void load().catch(() =>
      setMapStatus("No se pudo cargar el mapa. Podés ingresar el domicilio manualmente."),
    );
    return () => {
      disposed = true;
      setPinRef.current = null;
      reverseGeocodeRef.current = null;
      markerRef.current?.setMap(null);
    };
  }, [mapsApiKey]);

  function fillAddress(place: SelectedPlace) {
    fillAddressComponents(place.addressComponents ?? [], place.formattedAddress ?? "");
  }

  function fillAddressComponents(components: PlaceComponent[], formattedAddress: string) {
    const component = (type: string) =>
      components.find((item) => item.types?.includes(type))?.longText ??
      components.find((item) => item.types?.includes(type))?.long_name ??
      "";
    setInputValue("street", component("route"));
    setInputValue("number", component("street_number"));
    setInputValue("neighborhood", component("neighborhood") || component("sublocality"));
    setInputValue("normalizedAddress", formattedAddress);
  }

  function fillResolvedAddress(address: ResolvedAddress) {
    setInputValue("street", address.street ?? "");
    setInputValue("number", address.number ?? "");
    setInputValue("neighborhood", address.neighborhood ?? "");
    setInputValue("normalizedAddress", address.normalizedAddress ?? "");
  }

  function setInputValue(name: string, value: string) {
    const input = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
    if (input) input.value = value;
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setMapStatus(
        "Este navegador no permite obtener la ubicación actual. Podés usar el mapa o completar el domicilio manualmente.",
      );
      return;
    }
    if (!setPinRef.current) {
      setMapStatus("El mapa todavía se está preparando. Intentá nuevamente en unos segundos.");
      return;
    }
    setMapStatus("Solicitando ubicación actual…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPinRef.current?.(coords.latitude, coords.longitude);
        void reverseGeocodeRef.current?.(coords.latitude, coords.longitude);
      },
      () =>
        setMapStatus(
          "No pudimos obtener tu ubicación. Podés elegir el punto en el mapa o completar el domicilio manualmente.",
        ),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  async function submit(formData: FormData) {
    const description = requiredText(formData.get("description"));
    const street = requiredText(formData.get("street"));
    const number = requiredText(formData.get("number"));
    if (!selectedOfferId || !description || !street || !number) {
      setMessage("Completá descripción, calle y número. La oferta debe estar vigente.");
      return;
    }
    const files = formData
      .getAll("media")
      .filter((value): value is File => value instanceof File && value.size > 0);
    const evidenceError = evidenceValidation(files);
    if (evidenceError) {
      setMessage(evidenceError);
      return;
    }

    setSubmitting(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          offerId: selectedOfferId,
          description,
          address: {
            street,
            number,
            neighborhood: optionalText(formData.get("neighborhood")),
            crossStreetOne: optionalText(formData.get("crossStreetOne")),
            crossStreetTwo: optionalText(formData.get("crossStreetTwo")),
            normalizedAddress: optionalText(formData.get("normalizedAddress")),
            ...(coordinates
              ? {
                  latitude: coordinates.latitude.toFixed(6),
                  longitude: coordinates.longitude.toFixed(6),
                }
              : {}),
          },
        }),
      });
      if (response.status === 401) {
        setMessage(
          "Tu sesión venció o pertenece a otro portal. Ingresá nuevamente como cliente y reintentá.",
        );
        return;
      }
      if (!response.ok) throw new Error("request");
      const created = (await response.json()) as { id: string };
      setCreatedRequestId(created.id);
      setIdempotencyKey(crypto.randomUUID());
      const uploads = await uploadEvidence(created.id, files);
      setEvidenceAttached(files.length > 0 && uploads.every((upload) => upload.ok));
      setMessage(
        !files.length
          ? "Solicitud creada. Adjuntá una foto o video para dejarla operable."
          : uploads.every((upload) => upload.ok)
            ? "Solicitud creada y evidencia adjuntada: quedó operable."
            : "Solicitud creada, pero no se pudo adjuntar toda la evidencia.",
      );
    } catch {
      setMessage("No se pudo crear la solicitud. Revisá los datos e intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryEvidence() {
    if (!createdRequestId) return;
    const evidenceError = evidenceValidation(pendingEvidence);
    if (evidenceError) {
      setMessage(evidenceError);
      return;
    }
    setSubmitting(true);
    setMessage(undefined);
    try {
      const uploads = await uploadEvidence(createdRequestId, pendingEvidence);
      if (uploads.every((upload) => upload.ok)) {
        setPendingEvidence([]);
        setEvidenceAttached(true);
        setMessage("Evidencia adjuntada: la solicitud quedó operable.");
      } else {
        setMessage(
          "No se pudo adjuntar toda la evidencia. Elegí nuevamente el archivo e intentá de nuevo.",
        );
      }
    } catch {
      setMessage(
        "No se pudo adjuntar la evidencia. Elegí nuevamente el archivo e intentá de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="request-form" action={submit} aria-label="Crear solicitud">
      <div className="request-form__heading">
        <span>1</span>
        <div>
          <h2>Contanos qué necesitás</h2>
          <p>La visita se confirma con la oferta vigente.</p>
        </div>
      </div>
      <label className="request-form__field request-form__field--wide">
        Oferta vigente
        <select
          value={selectedOfferId}
          onChange={(event) => setSelectedOfferId(event.target.value)}
          required
        >
          <option value="">Seleccioná una oferta</option>
          {offers.map((offer) => (
            <option key={offer.category.id} value={offer.category.id}>
              {offer.category.name} — {offer.currency} {offer.price}
            </option>
          ))}
        </select>
      </label>
      {offers.find((offer) => offer.category.id === selectedOfferId) && (
        <p className="request-form__offer">
          {offers.find((offer) => offer.category.id === selectedOfferId)?.category.scope}
        </p>
      )}
      <label className="request-form__field request-form__field--wide">
        Descripción del problema
        <textarea
          name="description"
          required
          maxLength={2000}
          placeholder="Ej.: pierde agua debajo de la bacha"
        />
      </label>

      <div className="request-form__heading">
        <span>2</span>
        <div>
          <h2>Elegí el domicilio</h2>
          <p>Buscá una dirección o mové el pin. También podés ingresarlo manualmente.</p>
        </div>
      </div>
      <div className="request-form__map-tools">
        <div ref={autocompleteRef} className="request-form__autocomplete" />
        <button className="request-form__location-button" type="button" onClick={locateMe}>
          Usar mi ubicación actual
        </button>
        <p role="status">{mapStatus}</p>
      </div>
      <div
        ref={mapRef}
        className="request-form__map"
        aria-label="Mapa para seleccionar domicilio"
      />
      <div className="request-form__grid">
        <label className="request-form__field">
          Calle
          <input name="street" required autoComplete="address-line1" />
        </label>
        <label className="request-form__field">
          Número
          <input name="number" required inputMode="numeric" />
        </label>
        <label className="request-form__field">
          Barrio
          <input name="neighborhood" autoComplete="address-level3" />
        </label>
        <label className="request-form__field">
          Entrecalle 1<input name="crossStreetOne" />
        </label>
        <label className="request-form__field">
          Entrecalle 2<input name="crossStreetTwo" />
        </label>
      </div>
      <input name="normalizedAddress" type="hidden" />

      <div className="request-form__heading">
        <span>3</span>
        <div>
          <h2>Sumá evidencia</h2>
          <p>Hasta 5 imágenes (10 MB cada una) y 1 video MP4 (50 MB).</p>
        </div>
      </div>
      <label className="request-form__upload">
        Elegir fotos o video
        <input name="media" type="file" accept="image/jpeg,image/png,video/mp4" multiple />
      </label>
      <p className="request-form__hint">
        {evidenceAttached
          ? "La evidencia quedó adjuntada y la solicitud ya puede operar."
          : "Si creás la solicitud sin una foto o video, podés adjuntarlo después para dejarla operable."}
      </p>
      <button type="submit" disabled={submitting || !selectedOfferId}>
        {submitting ? "Creando solicitud…" : "Crear solicitud"}
      </button>
      {createdRequestId && !evidenceAttached && (
        <div className="request-form__retry">
          <p>
            ¿La creaste sin evidencia o falló la carga? Podés adjuntarla ahora sin duplicar la
            solicitud.
          </p>
          <label className="request-form__upload">
            Elegir evidencia para la solicitud creada
            <input
              type="file"
              accept="image/jpeg,image/png,video/mp4"
              multiple
              onChange={(event) => setPendingEvidence(Array.from(event.currentTarget.files ?? []))}
            />
          </label>
          <button
            type="button"
            disabled={submitting || !pendingEvidence.length}
            onClick={retryEvidence}
          >
            Adjuntar evidencia
          </button>
        </div>
      )}
      {message && (
        <p className="request-form__message" role="status">
          {message}
        </p>
      )}
    </form>
  );
}

function requiredText(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalText(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function evidenceValidation(files: File[]): string | undefined {
  const invalidFiles = files.some(
    (file) =>
      !["image/jpeg", "image/png", "video/mp4"].includes(file.type) ||
      (file.type === "video/mp4" ? file.size > 50 * 1024 * 1024 : file.size > 10 * 1024 * 1024),
  );
  const images = files.filter((file) => file.type === "image/jpeg" || file.type === "image/png");
  const videos = files.filter((file) => file.type === "video/mp4");
  return invalidFiles || images.length > 5 || videos.length > 1
    ? "Podés adjuntar hasta cinco imágenes (10 MB cada una) y un MP4 (50 MB)."
    : undefined;
}

function uploadEvidence(requestId: string, files: File[]) {
  return Promise.all(
    files.map((file) =>
      fetch(`/api/requests/${requestId}/media`, {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      }),
    ),
  );
}

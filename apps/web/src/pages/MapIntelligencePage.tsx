import { ModulePlaceholder } from "../components/ui/ModulePlaceholder";

export function MapIntelligencePage() {
  return (
    <ModulePlaceholder
      title="Map Intelligence"
      description="Geographic events will be plotted later: transaction cities, merchants, clusters, and optionally ATM locations as map features only."
      planned={[
        "Interactive GIS map",
        "Suspicious activity clusters",
        "Merchant and city overlays",
        "Hotspot prediction research — no ATM control",
      ]}
    />
  );
}

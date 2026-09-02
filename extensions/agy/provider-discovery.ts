// Agy provider discovery projects configured runtime models into the catalog.
import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";
import { AGY_PROVIDER_ID, buildAgyProviderConfig } from "./catalog.js";
import { agyModelDirectory, readAgyModelDirectoryConfig } from "./model-directory.js";

const agyProviderDiscovery: ProviderPlugin = {
  id: AGY_PROVIDER_ID,
  label: "Agy CLI",
  docsPath: "/providers/agy",
  auth: [],
  catalog: {
    order: "late",
    run: async (ctx) => {
      const models = await agyModelDirectory.prepare(readAgyModelDirectoryConfig(ctx.config));
      return { provider: buildAgyProviderConfig(models) };
    },
  },
};

export default agyProviderDiscovery;

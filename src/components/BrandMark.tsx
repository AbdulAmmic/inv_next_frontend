"use client";

import { useEffect, useState } from "react";
import { getCachedBusiness, BusinessInfo } from "@/businessTheme";

/**
 * Renders the current tenant's logo if one is set, otherwise a neutral
 * initial-avatar in their brand color — never a hardcoded Tuhanas asset.
 * Reads from businessTheme's localStorage cache so it works even before
 * the network refresh in dashboardLayout resolves.
 */
export default function BrandMark({ size = 40, rounded = "rounded-xl" }: { size?: number; rounded?: string }) {
  const [business, setBusiness] = useState<BusinessInfo | null>(null);

  useEffect(() => {
    setBusiness(getCachedBusiness());
  }, []);

  const logoUrl = business?.theme?.logo_url;
  const color = business?.theme?.primary_color || "#6366f1";
  const initial = (business?.name || "I").trim().charAt(0).toUpperCase();

  if (logoUrl) {
    // Plain <img>, not next/image — logos come from arbitrary tenant-supplied
    // URLs that aren't in next.config's image domain allowlist.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={business?.name || "Business logo"}
        style={{ width: size, height: size, objectFit: "contain" }}
        className={rounded}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-black text-white ${rounded}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}

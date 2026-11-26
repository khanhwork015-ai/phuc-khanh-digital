export const userRoles = ["ADMIN", "CUSTOMER"] as const;
export type UserRole = (typeof userRoles)[number];

export const leadStatuses = ["new", "contacting", "converted", "archived"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const customerSources = ["online_lead", "offline_contract"] as const;
export type CustomerSource = (typeof customerSources)[number];

export const contractStatuses = ["onboarding", "active", "paused", "completed"] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export const brandAssetTypes = ["pdf", "image", "palette", "guideline"] as const;
export type BrandAssetType = (typeof brandAssetTypes)[number];

export const contentMediaTypes = ["image", "video", "album", "text"] as const;
export type ContentMediaType = (typeof contentMediaTypes)[number];

export const contentStatuses = [
  "pending_review",
  "pending_client",
  "approved",
  "changes_requested",
  "scheduled",
  "published",
] as const;
export type ContentStatus = (typeof contentStatuses)[number];

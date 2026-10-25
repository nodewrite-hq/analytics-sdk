import type { Access, CollectionConfig } from "payload";
import { analyticsEventsAccess } from "./access.js";

export const ANALYTICS_EVENTS_SLUG = "analytics-events";

/** Hidden collection. Editors read the report, they do not create rows. */
export function analyticsEventsCollection(read?: Access): CollectionConfig {
  return {
    slug: ANALYTICS_EVENTS_SLUG,
    labels: {
      singular: "Analytics event",
      plural: "Analytics events",
    },
    admin: {
      hidden: true,
    },
    timestamps: false,
    versions: false,
    access: analyticsEventsAccess(read),
    fields: [
      {
        name: "kind",
        type: "select",
        required: true,
        options: [
          { label: "View", value: "view" },
          { label: "Click", value: "click" },
        ],
      },
      {
        name: "path",
        type: "text",
        required: true,
        maxLength: 2048,
      },
      {
        name: "locale",
        type: "text",
        maxLength: 35,
      },
      {
        name: "occurredAt",
        type: "date",
        required: true,
      },
      {
        name: "durationSeconds",
        type: "number",
        min: 0,
        max: 1800,
      },
      {
        name: "country",
        type: "text",
        maxLength: 2,
      },
      {
        name: "city",
        type: "text",
        maxLength: 80,
      },
      {
        name: "sessionId",
        type: "text",
        maxLength: 36,
      },
      {
        name: "eventName",
        type: "text",
        maxLength: 64,
      },
    ],
  };
}

import type { Access } from "payload";

const deny: Access = () => false;

/**
 * Read is allowed for a signed-in user, or by the function the plugin was given.
 * Create, update, and delete stay closed. The ingest endpoint writes with overrideAccess.
 */
export function analyticsEventsAccess(read?: Access): {
  read: Access;
  create: Access;
  update: Access;
  delete: Access;
} {
  return {
    read: (args) => (read ? read(args) : Boolean(args.req.user)),
    create: deny,
    update: deny,
    delete: deny,
  };
}

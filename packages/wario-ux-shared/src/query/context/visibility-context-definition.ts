import React from "react";

import { type CategoryVisibilityMap } from "@wcp/wario-shared/logic";

/**
 * Context for providing a pre-computed CategoryVisibilityMap to descendant components.
 * Use with VisibilityMapProvider at the root and useCategoryVisibility in descendants.
 */
export const VisibilityMapContext = React.createContext<CategoryVisibilityMap | null>(null);

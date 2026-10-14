import { createNavigation } from "next-intl/navigation";

import { configuration } from "./configuration";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(configuration);
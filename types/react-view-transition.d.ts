// React 19's shipped types don't yet declare `ViewTransition`, but Next.js
// aliases `react` to a build that exports it for App Router code — see
// node_modules/next/dist/docs/01-app/02-guides/view-transitions.md.
import type { ReactNode } from "react";

declare module "react" {
  type ViewTransitionAnimation = "auto" | "none" | Record<string, string>;

  export const ViewTransition: (props: {
    name?: string;
    share?: ViewTransitionAnimation;
    enter?: ViewTransitionAnimation;
    exit?: ViewTransitionAnimation;
    default?: ViewTransitionAnimation;
    children?: ReactNode;
  }) => ReactNode;
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href">;
function ContextHomeLink(props: Props) {
  const params = useSearchParams();
  return <Link {...props} href={params.get("from") === "cinematic" ? "/cinematic" : "/"} />;
}
// Normal entry stays static; cinematic destinations preserve their return path.
export default function HomeLink(props: Props) {
  return <Suspense fallback={<Link {...props} href="/" />}><ContextHomeLink {...props} /></Suspense>;
}

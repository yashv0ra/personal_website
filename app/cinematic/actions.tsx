"use server";

import type { ReactNode } from "react";
import Desk from "@/components/desk/Desk";
import { resume } from "@/lib/resume";

export async function unlockCinematic(formData: FormData): Promise<{
  content: ReactNode;
  error: string;
}> {
  // Check every request on the server. Never accept a client-provided unlocked
  // flag or send the password to the browser in the initial page/bundle.
  if (formData.get("password") !== "1111") {
    return { content: null, error: "Incorrect password. Try again." };
  }

  // Return the experience only after validation. No reusable password, token,
  // or unlocked flag is stored in browser storage; a new visit starts locked.
  return {
    content: <Desk resume={resume} />,
    error: "",
  };
}

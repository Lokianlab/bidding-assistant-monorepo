import { redirect } from "next/navigation";

export default function OutputPage() {
  redirect("/tools/quality-gate?tab=output");
}

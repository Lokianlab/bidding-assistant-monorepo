import { redirect } from "next/navigation";

export default function QualityPage() {
  redirect("/tools/quality-gate?tab=text");
}

import { redirect } from "next/navigation";

export default function DocxPage() {
  redirect("/tools/quality-gate?tab=output");
}

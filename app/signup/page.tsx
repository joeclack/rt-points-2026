import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/login?message=Admin%20accounts%20are%20invitation%20only");
}

import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Admin invitation required</CardTitle>
          <CardDescription>
            This account is signed in, but it has not been authorised as a tournament
            administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button className="w-full" type="submit">
              Log out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

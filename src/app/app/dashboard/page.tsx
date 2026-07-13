import { authOptions } from "@/lib/auth";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Overview coming soon.
      </Typography>
    </Container>
  );
}

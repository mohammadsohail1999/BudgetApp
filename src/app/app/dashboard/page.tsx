import { authOptions } from "@/lib/auth";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Welcome, {session.user.name ?? "User"}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Your dashboard is coming soon.
        </Typography>
      </Box>
    </Box>
  );
}

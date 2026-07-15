import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";

export default function DashboardLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Skeleton variant="text" width={120} height={32} />
        <Box sx={{ flexGrow: 1 }} />
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={140} height={28} />
        <Skeleton variant="circular" width={32} height={32} />
      </Box>

      {/* KPI cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" width="55%" height={18} />
                    <Skeleton variant="text" width="70%" height={36} sx={{ mt: 0.5 }} />
                  </Box>
                  <Skeleton variant="circular" width={44} height={44} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="50%" height={28} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent transactions */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Skeleton variant="text" width={180} height={28} />
            <Skeleton variant="text" width={60} height={24} />
          </Box>
          {[1, 2, 3, 4, 5].map((i) => (
            <Box
              key={i}
              sx={{ display: "flex", gap: 2, py: 1.5, alignItems: "center" }}
            >
              <Skeleton variant="circular" width={38} height={38} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width="45%" height={18} />
                <Skeleton variant="text" width="30%" height={14} />
              </Box>
              <Skeleton variant="text" width={90} height={18} />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}

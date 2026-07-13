import PieChartIcon from "@mui/icons-material/PieChart";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  children: ReactNode;
}

export default function AuthCard({
  title,
  subtitle,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  children,
}: AuthCardProps) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
        py: 6,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 440 }}>
        {/* Logo / Brand */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Avatar
            sx={{
              mx: "auto",
              mb: 2,
              width: 48,
              height: 48,
              bgcolor: "primary.main",
            }}
          >
            <PieChartIcon />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>

        {/* Card */}
        <Card>
          <CardContent sx={{ p: 4 }}>{children}</CardContent>
        </Card>

        {/* Footer */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: "center" }}
        >
          {footerText}{" "}
          <MuiLink
            component={Link}
            href={footerLinkHref}
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            {footerLinkLabel}
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
}

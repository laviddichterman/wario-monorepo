import { Stack } from '@mui/material';
import Container from '@mui/material/Container';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { spreadSx } from '@wcp/wario-ux-shared';

import { useAppSelector } from '@/hooks/useRedux';

import { Label } from '@/components/label';

const FooterRoot = styled('footer')(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.vars.palette.background.default,
}));

export type FooterProps = React.ComponentProps<typeof FooterRoot>;

export function DashboardFooter({ sx, ...other }: FooterProps) {
  const backendVersion = useAppSelector((s) => s.ws.catalog ? `v${s.ws.catalog.api.major.toString()}.${s.ws.catalog.api.minor.toString()}.${s.ws.catalog.api.patch.toString()}` : null);
  return (
    <FooterRoot
      sx={[
        {
          py: 5,
          textAlign: 'center',
        },
        ...spreadSx(sx),
      ]}
      {...other}
    >
      <Container>

        <Stack>
          <Typography variant="caption" component="p">WARIO Dashboard Version: <Label>v{__APP_VERSION__}</Label></Typography></Stack>
        {backendVersion ? <Stack><Typography variant="caption" component="p">WARIO Backend Server Version: <Label>{backendVersion}</Label></Typography></Stack> : ""}

        <Stack><Typography variant="caption" component="p">
          © {new Date().getFullYear()}&nbsp;made by&nbsp;Lavid Industries LLC,<br />released under the GNU General Public License v3
        </Typography>
        </Stack>
      </Container>
    </FooterRoot>
  );
}

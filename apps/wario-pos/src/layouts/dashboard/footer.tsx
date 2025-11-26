import { Stack } from '@mui/material';
import Container from '@mui/material/Container';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { spreadSx } from '@wcp/wario-ux-shared/common';

import { VersionInfo } from '@/components/wario/version';

const FooterRoot = styled('footer')(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.vars.palette.background.default,
}));

export type FooterProps = React.ComponentProps<typeof FooterRoot>;

export function DashboardFooter({ sx, ...other }: FooterProps) {
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
          <Typography variant="caption" component="p">WARIO Version: <VersionInfo /></Typography>
        </Stack>

        <Stack><Typography variant="caption" component="p">
          © {new Date().getFullYear()}&nbsp;made by&nbsp;Lavid Industries LLC,<br />released under the GNU General Public License v3
        </Typography>
        </Stack>
      </Container>
    </FooterRoot>
  );
}
